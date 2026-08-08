import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCompOffCreditDto } from './dto/comp-off.dto';
import { CompOffCreditEntity } from './entities/comp-off-credit.entity';
import { CompOffCreditStatus } from './enums/comp-off.enum';
import {
  assertWorkerRecordAccess,
  decimalToNumber,
  isPeopleOpsOrAdmin,
  toDecimalString,
} from './time-leave-scope.util';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

export type CompOffBalance = {
  workerId: string;
  availableDays: number;
  usedDays: number;
  expiredDays: number;
};

@Injectable()
export class CompOffService {
  constructor(
    @InjectRepository(CompOffCreditEntity)
    private readonly creditRepository: Repository<CompOffCreditEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async grantCredit(
    dto: CreateCompOffCreditDto,
    actor: ActorContext,
  ): Promise<CompOffCreditEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const worker = await this.getWorkerOrThrow(dto.workerId, tenantId);
    const grantingWorkerId = await this.assertCanGrant(
      actor.userId,
      worker,
      tenantId,
    );

    if (dto.expiryDate && dto.expiryDate < dto.earnedDate) {
      throw new BadRequestException({
        code: 'COMP_OFF_INVALID_EXPIRY',
        message: 'expiryDate cannot be before earnedDate',
      });
    }

    const saved = await this.creditRepository.save(
      this.creditRepository.create({
        tenantId,
        workerId: dto.workerId,
        creditedDays: toDecimalString(dto.creditedDays),
        earnedDate: dto.earnedDate,
        expiryDate: dto.expiryDate ?? null,
        sourceReference: dto.sourceReference ?? null,
        status: CompOffCreditStatus.ACTIVE,
        grantedByWorkerId: grantingWorkerId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'comp_off_credit.grant',
      entityType: 'comp_off_credit',
      entityId: saved.id,
      changes: {
        workerId: { old: null, new: saved.workerId },
        creditedDays: { old: null, new: saved.creditedDays },
        earnedDate: { old: null, new: saved.earnedDate },
        expiryDate: { old: null, new: saved.expiryDate },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  async listCredits(
    actorUserId: string,
    workerId: string | undefined,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<CompOffCreditEntity[]> {
    const targetWorkerId = await this.resolveTargetWorkerId(
      actorUserId,
      workerId,
      tenantId,
    );
    if (!targetWorkerId) {
      return [];
    }

    await this.expireOutdatedCredits(targetWorkerId, tenantId);

    return this.creditRepository.find({
      where: { tenantId, workerId: targetWorkerId },
      order: { earnedDate: 'DESC' },
    });
  }

  async getBalance(
    actorUserId: string,
    workerId: string | undefined,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<CompOffBalance> {
    const targetWorkerId = await this.resolveTargetWorkerId(
      actorUserId,
      workerId,
      tenantId,
    );
    if (!targetWorkerId) {
      return {
        workerId: workerId ?? '',
        availableDays: 0,
        usedDays: 0,
        expiredDays: 0,
      };
    }

    await this.expireOutdatedCredits(targetWorkerId, tenantId);

    const credits = await this.creditRepository.find({
      where: { tenantId, workerId: targetWorkerId },
    });

    const summary = credits.reduce(
      (acc, credit) => {
        const days = decimalToNumber(credit.creditedDays);
        if (credit.status === CompOffCreditStatus.ACTIVE) {
          acc.availableDays += days;
        } else if (credit.status === CompOffCreditStatus.USED) {
          acc.usedDays += days;
        } else if (credit.status === CompOffCreditStatus.EXPIRED) {
          acc.expiredDays += days;
        }
        return acc;
      },
      { availableDays: 0, usedDays: 0, expiredDays: 0 },
    );

    return { workerId: targetWorkerId, ...summary };
  }

  /**
   * Marks a worker's oldest available comp-off credits as used, up to `days`.
   * Optional integration point for leave request approval flows that want
   * to draw down comp-off balance instead of (or alongside) leave accrual.
   */
  async consumeCredits(
    workerId: string,
    days: number,
    leaveRequestId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<number> {
    await this.expireOutdatedCredits(workerId, tenantId);

    const activeCredits = await this.creditRepository.find({
      where: { tenantId, workerId, status: CompOffCreditStatus.ACTIVE },
      order: { earnedDate: 'ASC' },
    });

    let remaining = days;
    for (const credit of activeCredits) {
      if (remaining <= 0) {
        break;
      }
      const creditDays = decimalToNumber(credit.creditedDays);
      if (creditDays <= remaining) {
        credit.status = CompOffCreditStatus.USED;
        credit.usedInLeaveRequestId = leaveRequestId;
        remaining -= creditDays;
        await this.creditRepository.save(credit);
      }
    }

    return days - remaining;
  }

  private async expireOutdatedCredits(
    workerId: string,
    tenantId: string,
  ): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const expired = await this.creditRepository.find({
      where: { tenantId, workerId, status: CompOffCreditStatus.ACTIVE },
    });

    const toExpire = expired.filter(
      (credit) => credit.expiryDate && credit.expiryDate < today,
    );
    if (toExpire.length === 0) {
      return;
    }

    for (const credit of toExpire) {
      credit.status = CompOffCreditStatus.EXPIRED;
    }
    await this.creditRepository.save(toExpire);
  }

  private async resolveTargetWorkerId(
    actorUserId: string,
    workerId: string | undefined,
    tenantId: string,
  ): Promise<string | null> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    if (!workerId) {
      return actingWorkerId;
    }

    const target = await this.getWorkerOrThrow(workerId, tenantId);
    assertWorkerRecordAccess(auth, actingWorkerId, target);
    return workerId;
  }

  private async assertCanGrant(
    actorUserId: string,
    worker: WorkerEntity,
    tenantId: string,
  ): Promise<string> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );

    if (isPeopleOpsOrAdmin(auth)) {
      return actingWorkerId ?? actorUserId;
    }

    if (actingWorkerId && worker.managerId === actingWorkerId) {
      return actingWorkerId;
    }

    throw new ForbiddenException({
      code: 'FORBIDDEN',
      message:
        "Only the worker's manager or People Ops can grant comp-off credit",
    });
  }

  private async getWorkerOrThrow(
    workerId: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }
    return worker;
  }
}
