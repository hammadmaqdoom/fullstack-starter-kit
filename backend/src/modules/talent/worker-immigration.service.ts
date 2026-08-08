import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateVisaAttachmentDto,
  CreateWorkerPassportDto,
  CreateWorkerVisaRecordDto,
} from './dto/pre-boarding.dto';
import { WorkerPassportEntity } from './entities/worker-passport.entity';
import { WorkerVisaAttachmentEntity } from './entities/worker-visa-attachment.entity';
import { WorkerVisaRecordEntity } from './entities/worker-visa-record.entity';
import { PassportSource } from './enums/onboarding.enum';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class WorkerImmigrationService {
  constructor(
    @InjectRepository(WorkerPassportEntity)
    private readonly passportRepository: Repository<WorkerPassportEntity>,
    @InjectRepository(WorkerVisaRecordEntity)
    private readonly visaRepository: Repository<WorkerVisaRecordEntity>,
    @InjectRepository(WorkerVisaAttachmentEntity)
    private readonly attachmentRepository: Repository<WorkerVisaAttachmentEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async listPassports(
    workerId: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<WorkerPassportEntity[]> {
    await this.assertPeopleOps(actorId, tenantId);
    await this.assertWorker(workerId, tenantId);
    return this.passportRepository.find({
      where: { tenantId, workerId },
      order: { expiryDate: 'DESC' },
    });
  }

  async createPassport(
    workerId: string,
    dto: CreateWorkerPassportDto,
    actor: ActorContext,
  ): Promise<WorkerPassportEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);
    await this.assertWorker(workerId, tenantId);

    if (dto.source !== PassportSource.RENEWAL) {
      await this.passportRepository.update(
        { tenantId, workerId, isCurrent: true },
        { isCurrent: false },
      );
    }

    const passport = await this.passportRepository.save(
      this.passportRepository.create({
        tenantId,
        workerId,
        passportNumber: dto.passportNumber,
        nationalityCode: dto.nationalityCode.toUpperCase(),
        issuingCountryCode: dto.issuingCountryCode.toUpperCase(),
        placeOfIssue: dto.placeOfIssue ?? null,
        issueDate: dto.issueDate,
        expiryDate: dto.expiryDate,
        isCurrent: true,
        source: dto.source ?? PassportSource.MANUAL,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'worker.passport.create',
      entityType: 'worker_passport',
      entityId: passport.id,
      changes: {
        workerId: { old: null, new: workerId },
        nationalityCode: { old: null, new: passport.nationalityCode },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return passport;
  }

  async listVisaRecords(
    workerId: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<WorkerVisaRecordEntity[]> {
    await this.assertPeopleOps(actorId, tenantId);
    await this.assertWorker(workerId, tenantId);
    return this.visaRepository.find({
      where: { tenantId, workerId },
      relations: ['attachments'],
      order: { createdAt: 'DESC' },
    });
  }

  async createVisaRecord(
    workerId: string,
    dto: CreateWorkerVisaRecordDto,
    actor: ActorContext,
  ): Promise<WorkerVisaRecordEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);
    await this.assertWorker(workerId, tenantId);

    const record = await this.visaRepository.save(
      this.visaRepository.create({
        tenantId,
        workerId,
        countryCode: dto.countryCode.toUpperCase(),
        recordType: dto.recordType,
        statusCode: dto.statusCode,
        visaOrPassType: dto.visaOrPassType ?? null,
        documentNumber: dto.documentNumber ?? null,
        sponsorOrEmployer: dto.sponsorOrEmployer ?? null,
        uidNumber: null,
        labourCardNumber: null,
        emiratesId: null,
        nric: null,
        ipaReference: null,
        applicationStatus: dto.applicationStatus ?? null,
        issueDate: dto.issueDate ?? null,
        expiryDate: dto.expiryDate ?? null,
        cancellationDate: null,
        cancellationReason: null,
        passportId: dto.passportId ?? null,
        supersededById: null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'worker.visa_record.create',
      entityType: 'worker_visa_record',
      entityId: record.id,
      changes: {
        workerId: { old: null, new: workerId },
        countryCode: { old: null, new: record.countryCode },
        recordType: { old: null, new: record.recordType },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return record;
  }

  async addAttachment(
    workerId: string,
    visaRecordId: string,
    dto: CreateVisaAttachmentDto,
    actor: ActorContext,
  ): Promise<WorkerVisaAttachmentEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);
    await this.assertWorker(workerId, tenantId);

    const record = await this.visaRepository.findOne({
      where: { id: visaRecordId, workerId, tenantId },
    });
    if (!record) {
      throw new NotFoundException({
        code: 'VISA_RECORD_NOT_FOUND',
        message: 'Visa record not found',
      });
    }

    const attachment = await this.attachmentRepository.save(
      this.attachmentRepository.create({
        tenantId,
        visaRecordId,
        passportId: dto.passportId ?? record.passportId,
        attachmentType: dto.attachmentType,
        blobUrl: dto.blobUrl,
        uploadedBy: actor.userId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'worker.visa_attachment.create',
      entityType: 'worker_visa_attachment',
      entityId: attachment.id,
      changes: {
        visaRecordId: { old: null, new: visaRecordId },
        attachmentType: { old: null, new: dto.attachmentType },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return attachment;
  }

  private async assertWorker(
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

  private async assertPeopleOps(
    actorId: string,
    tenantId: string,
  ): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actorId, tenantId);
    const allowed = auth.roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: 'IMMIGRATION_ACCESS_DENIED',
        message: 'People Ops access required',
      });
    }
  }
}
