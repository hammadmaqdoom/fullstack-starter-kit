import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubmitProfileChangeRequestDto } from './dto/profile-change-request.dto';
import { ProfileChangeRequestEntity } from './entities/profile-change-request.entity';
import { WorkerEntity } from './entities/worker.entity';
import { ApprovalStatus } from './enums/org.enum';

const EMPLOYEE_EDITABLE_FIELDS = new Set([
  'phone',
  'personalEmail',
  'timezone',
]);

@Injectable()
export class ProfileChangeRequestService {
  constructor(
    @InjectRepository(ProfileChangeRequestEntity)
    private readonly requestRepository: Repository<ProfileChangeRequestEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async submit(
    workerId: string,
    dto: SubmitProfileChangeRequestDto,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ProfileChangeRequestEntity> {
    const worker = await this.getWorkerOrThrow(workerId, tenantId);
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);

    const isPeopleOps = auth.roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );

    if (!isPeopleOps) {
      const invalidFields = Object.keys(dto.fieldChanges).filter(
        (field) => !EMPLOYEE_EDITABLE_FIELDS.has(field),
      );
      if (invalidFields.length > 0) {
        throw new ForbiddenException({
          code: 'FORBIDDEN',
          message: `Fields require People Ops approval: ${invalidFields.join(', ')}`,
        });
      }
    }

    const request = await this.requestRepository.save(
      this.requestRepository.create({
        tenantId,
        workerId: worker.id,
        fieldChanges: dto.fieldChanges,
        status: ApprovalStatus.SUBMITTED,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'profile_change_request.submit',
      entityType: 'profile_change_request',
      entityId: request.id,
      changes: {
        status: { old: null, new: ApprovalStatus.SUBMITTED },
        workerId: { old: null, new: worker.id },
      },
      correlationId,
      ipAddress,
    });

    return request;
  }

  async listByWorker(
    workerId: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ProfileChangeRequestEntity[]> {
    await this.getWorkerOrThrow(workerId, tenantId);

    return this.requestRepository.find({
      where: { tenantId, workerId },
      order: { createdAt: 'DESC' },
    });
  }

  async approve(
    requestId: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ProfileChangeRequestEntity> {
    await this.assertApprover(actorId, tenantId);
    const request = await this.getRequestOrThrow(requestId, tenantId);

    if (request.status !== ApprovalStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST_STATUS',
        message: 'Only submitted requests can be approved',
      });
    }

    const worker = await this.getWorkerOrThrow(request.workerId, tenantId);
    const before = { ...worker };

    for (const [field, change] of Object.entries(request.fieldChanges)) {
      if (field in worker) {
        (worker as unknown as Record<string, unknown>)[field] = change.new;
      }
    }

    await this.workerRepository.save(worker);
    request.status = ApprovalStatus.APPROVED;
    request.approverId = actorId;
    const saved = await this.requestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'profile_change_request.approve',
      entityType: 'profile_change_request',
      entityId: saved.id,
      changes: {
        status: { old: ApprovalStatus.SUBMITTED, new: ApprovalStatus.APPROVED },
        workerId: { old: before.id, new: worker.id },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  async reject(
    requestId: string,
    reason: string,
    actorId: string,
    correlationId?: string,
    ipAddress?: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<ProfileChangeRequestEntity> {
    await this.assertApprover(actorId, tenantId);
    const request = await this.getRequestOrThrow(requestId, tenantId);

    if (request.status !== ApprovalStatus.SUBMITTED) {
      throw new BadRequestException({
        code: 'INVALID_REQUEST_STATUS',
        message: 'Only submitted requests can be rejected',
      });
    }

    request.status = ApprovalStatus.REJECTED;
    request.approverId = actorId;
    request.reason = reason;
    const saved = await this.requestRepository.save(request);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'profile_change_request.reject',
      entityType: 'profile_change_request',
      entityId: saved.id,
      changes: {
        status: { old: ApprovalStatus.SUBMITTED, new: ApprovalStatus.REJECTED },
        reason: { old: null, new: reason },
      },
      correlationId,
      ipAddress,
    });

    return saved;
  }

  private async assertApprover(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const canApprove = auth.roleCodes.some((code) =>
      [
        PolarisRoleCode.PEOPLE_OPS,
        PolarisRoleCode.SUPER_ADMIN,
        PolarisRoleCode.MANAGER,
      ].includes(code as PolarisRoleCode),
    );

    if (!canApprove) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions to approve change requests',
      });
    }
  }

  private async getWorkerOrThrow(
    workerId: string,
    tenantId: string,
  ): Promise<WorkerEntity> {
    const worker = await this.workerRepository.findOne({
      where: { id: workerId, tenantId },
    });

    if (!worker || worker.deletedAt) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    return worker;
  }

  private async getRequestOrThrow(
    requestId: string,
    tenantId: string,
  ): Promise<ProfileChangeRequestEntity> {
    const request = await this.requestRepository.findOne({
      where: { id: requestId, tenantId },
    });

    if (!request) {
      throw new NotFoundException({
        code: 'PROFILE_CHANGE_REQUEST_NOT_FOUND',
        message: 'Profile change request not found',
      });
    }

    return request;
  }
}
