import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { RbacService } from '@/modules/compliance/rbac.service';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { PaginatedServiceResult } from '@/shared/types/api-envelope.type';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { QueryPayslipsDto } from './dto/payslip.dto';
import { PayRunLineItemEntity } from './entities/pay-run-line-item.entity';
import { PayRunEntity } from './entities/pay-run.entity';
import { PayslipEntity } from './entities/payslip.entity';
import { PayRunStatus, PayslipStatus } from './enums/payroll.enum';
import { isPayrollAdmin } from './payroll-scope.util';
import { PayslipBlobStorageService } from './payslip-blob-storage.service';
import { PayslipPdfService } from './payslip-pdf.service';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class PayslipService {
  constructor(
    @InjectRepository(PayslipEntity)
    private readonly payslipRepository: Repository<PayslipEntity>,
    @InjectRepository(PayRunEntity)
    private readonly payRunRepository: Repository<PayRunEntity>,
    @InjectRepository(PayRunLineItemEntity)
    private readonly lineItemRepository: Repository<PayRunLineItemEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly pdfService: PayslipPdfService,
    private readonly blobStorageService: PayslipBlobStorageService,
  ) {}

  /**
   * Creates + releases one payslip per pay run line item once the pay run is
   * approved (Finance+ only). Idempotent: line items that already have a
   * payslip are skipped so re-invocation after a partial failure is safe.
   */
  async releasePayslips(
    payRunId: string,
    actor: ActorContext,
  ): Promise<PayslipEntity[]> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const auth = await this.rbacService.getAuthContext(actor.userId, tenantId);

    if (!isPayrollAdmin(auth)) {
      throw new ForbiddenException({
        code: 'PAYSLIP_RELEASE_FORBIDDEN',
        message: 'Only payroll admins can release payslips',
      });
    }

    const payRun = await this.payRunRepository.findOne({
      where: { id: payRunId, tenantId },
    });
    if (!payRun) {
      throw new NotFoundException({
        code: 'PAY_RUN_NOT_FOUND',
        message: 'Pay run not found',
      });
    }

    if (payRun.status !== PayRunStatus.APPROVED) {
      throw new BadRequestException({
        code: 'PAY_RUN_NOT_APPROVED',
        message: 'Payslips can only be released from an approved pay run',
      });
    }

    const lineItems = await this.lineItemRepository.find({
      where: { payRunId: payRun.id, tenantId },
    });

    const existingPayslips = lineItems.length
      ? await this.payslipRepository.find({
          where: {
            tenantId,
            payRunLineItemId: In(lineItems.map((item) => item.id)),
          },
        })
      : [];
    const releasedLineItemIds = new Set(
      existingPayslips.map((payslip) => payslip.payRunLineItemId),
    );
    const pendingLineItems = lineItems.filter(
      (item) => !releasedLineItemIds.has(item.id),
    );

    const legalEntity = await this.legalEntityRepository.findOne({
      where: { id: payRun.legalEntityId, tenantId },
    });

    const releasedAt = new Date();
    const releasedPayslips: PayslipEntity[] = [];

    for (const lineItem of pendingLineItems) {
      const worker = await this.workerRepository.findOne({
        where: { id: lineItem.workerId, tenantId },
      });

      const created = await this.payslipRepository.save(
        this.payslipRepository.create({
          tenantId,
          legalEntityId: payRun.legalEntityId,
          payRunLineItemId: lineItem.id,
          workerId: lineItem.workerId,
          periodStart: payRun.periodStart,
          periodEnd: payRun.periodEnd,
          netPay: lineItem.netPay,
          currencyCode: lineItem.currencyCode,
          pdfBlobUrl: null,
          releasedAt,
          status: PayslipStatus.RELEASED,
        }),
      );

      const pdfBuffer = await this.pdfService.render({
        payslipId: created.id,
        workerName: worker
          ? `${worker.firstName} ${worker.lastName}`
          : 'Worker',
        legalEntityName: legalEntity?.registeredName ?? 'Digitaro',
        periodStart: payRun.periodStart,
        periodEnd: payRun.periodEnd,
        grossPay: lineItem.grossPay,
        totalDeductions: lineItem.totalDeductions,
        netPay: lineItem.netPay,
        currencyCode: lineItem.currencyCode,
        releasedAt,
      });

      created.pdfBlobUrl = await this.blobStorageService.upload(
        pdfBuffer,
        'payslips',
        `${created.id}.pdf`,
      );
      releasedPayslips.push(await this.payslipRepository.save(created));
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'payroll.payslip.release',
      entityType: 'pay_run',
      entityId: payRun.id,
      changes: {
        payslipCount: { old: null, new: releasedPayslips.length },
        skippedCount: { old: null, new: releasedLineItemIds.size },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return releasedPayslips;
  }

  async listPayslips(
    query: QueryPayslipsDto,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PaginatedServiceResult<PayslipEntity>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );
    const admin = isPayrollAdmin(auth);

    let targetWorkerId: string | undefined;
    if (admin) {
      targetWorkerId = query.workerId;
    } else {
      if (query.workerId && query.workerId !== actingWorkerId) {
        throw new ForbiddenException({
          code: 'PAYSLIP_ACCESS_DENIED',
          message: 'You can only view your own payslips',
        });
      }
      if (!actingWorkerId) {
        return {
          items: [],
          meta: { page, limit, totalItems: 0, totalPages: 0 },
        };
      }
      targetWorkerId = actingWorkerId;
    }

    const qb = this.payslipRepository
      .createQueryBuilder('payslip')
      .where('payslip.tenantId = :tenantId', { tenantId })
      .orderBy('payslip.periodStart', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (targetWorkerId) {
      qb.andWhere('payslip.workerId = :targetWorkerId', { targetWorkerId });
    }

    const [items, totalItems] = await qb.getManyAndCount();
    return {
      items,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 0,
      },
    };
  }

  async getPayslip(
    id: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PayslipEntity> {
    const payslip = await this.findPayslipOrFail(id, tenantId);
    await this.assertAccess(payslip, actorUserId, tenantId);
    return payslip;
  }

  async downloadPayslip(
    id: string,
    actorUserId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{ payslipId: string; pdfBlobUrl: string }> {
    const payslip = await this.findPayslipOrFail(id, tenantId);
    const admin = await this.assertAccess(payslip, actorUserId, tenantId);

    if (payslip.status !== PayslipStatus.RELEASED && !admin) {
      throw new ForbiddenException({
        code: 'PAYSLIP_NOT_RELEASED',
        message: 'This payslip has not been released yet',
      });
    }

    if (!payslip.pdfBlobUrl) {
      throw new NotFoundException({
        code: 'PAYSLIP_PDF_NOT_AVAILABLE',
        message: 'Payslip PDF has not been generated yet',
      });
    }

    return { payslipId: payslip.id, pdfBlobUrl: payslip.pdfBlobUrl };
  }

  private async findPayslipOrFail(
    id: string,
    tenantId: string,
  ): Promise<PayslipEntity> {
    const payslip = await this.payslipRepository.findOne({
      where: { id, tenantId },
    });
    if (!payslip) {
      throw new NotFoundException({
        code: 'PAYSLIP_NOT_FOUND',
        message: 'Payslip not found',
      });
    }
    return payslip;
  }

  /** Returns whether the actor is a payroll admin (bypasses "own only" scope). */
  private async assertAccess(
    payslip: PayslipEntity,
    actorUserId: string,
    tenantId: string,
  ): Promise<boolean> {
    const auth = await this.rbacService.getAuthContext(actorUserId, tenantId);
    if (isPayrollAdmin(auth)) {
      return true;
    }

    const actingWorkerId = await resolveActingWorkerId(
      this.workerRepository,
      actorUserId,
      tenantId,
    );
    if (!actingWorkerId || actingWorkerId !== payslip.workerId) {
      throw new ForbiddenException({
        code: 'PAYSLIP_ACCESS_DENIED',
        message: 'You do not have access to this payslip',
      });
    }
    return false;
  }
}
