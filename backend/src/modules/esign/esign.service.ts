import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  DIGITARO_TENANT_ID,
  SYSTEM_ACTOR_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { resolveActingWorkerId } from '@/modules/core-hr/worker-scope.util';
import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { createHash, randomBytes } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { buildCertificateOfCompletionPdf } from './certificate-of-completion.util';
import {
  CompleteSigningWithTokenDto,
  CreateEsignEnvelopeDto,
  IssueSigningTokenDto,
  ManualUploadEsignDto,
  SignEsignEnvelopeDto,
  VoidEsignEnvelopeDto,
} from './dto/esign.dto';
import { EsignAuditEventEntity } from './entities/esign-audit-event.entity';
import { EsignEnvelopeEntity } from './entities/esign-envelope.entity';
import { EsignFieldEntity } from './entities/esign-field.entity';
import { EsignSignatoryEntity } from './entities/esign-signatory.entity';
import {
  EsignAuditAction,
  EsignEnvelopeStatus,
  EsignSignatoryStatus,
  EsignSignatureMethod,
} from './enums/esign.enum';
import { EsignBlobStorageService } from './esign-blob-storage.service';
import {
  IPadesSealingService,
  PADES_SEALING_SERVICE,
  PadesSealResult,
} from './interfaces/pades-sealing.interface';
import { MailService } from '@/shared/mail/mail.service';

export type EsignActor = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

const DEFAULT_TOKEN_TTL_HOURS = 72;
const DEFAULT_ENVELOPE_TTL_DAYS = 14;

@Injectable()
export class EsignService {
  private readonly logger = new Logger(EsignService.name);

  constructor(
    @InjectRepository(EsignEnvelopeEntity)
    private readonly envelopeRepository: Repository<EsignEnvelopeEntity>,
    @InjectRepository(EsignSignatoryEntity)
    private readonly signatoryRepository: Repository<EsignSignatoryEntity>,
    @InjectRepository(EsignFieldEntity)
    private readonly fieldRepository: Repository<EsignFieldEntity>,
    @InjectRepository(EsignAuditEventEntity)
    private readonly esignAuditRepository: Repository<EsignAuditEventEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly dataSource: DataSource,
    @Inject(PADES_SEALING_SERVICE)
    private readonly padesSealing: IPadesSealingService,
    @InjectQueue(QueueEnum.Esign)
    private readonly esignQueue: Queue,
    private readonly blobStorage: EsignBlobStorageService,
    private readonly mailService: MailService,
  ) {}

  async create(
    dto: CreateEsignEnvelopeDto,
    actor: EsignActor,
  ): Promise<EsignEnvelopeEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + DEFAULT_ENVELOPE_TTL_DAYS);

    const envelopeId = await this.dataSource.transaction(async (manager) => {
      const envelope = await manager.save(
        EsignEnvelopeEntity,
        manager.create(EsignEnvelopeEntity, {
          tenantId,
          title: dto.title,
          documentBlobUrl: dto.documentBlobUrl ?? null,
          createdBy: actor.userId,
          status: EsignEnvelopeStatus.DRAFT,
          completedAt: null,
          voidedReason: null,
          expiresAt,
          sealedBlobUrl: null,
          certificateBlobUrl: null,
          signedCopyBlobUrl: null,
          lastReminderAt: null,
        }),
      );

      const signatories = await manager.save(
        EsignSignatoryEntity,
        dto.signatories.map((s) =>
          manager.create(EsignSignatoryEntity, {
            tenantId,
            envelopeId: envelope.id,
            workerId: s.workerId ?? null,
            email: s.email,
            name: s.name,
            signingOrder: s.signingOrder,
            status: EsignSignatoryStatus.PENDING,
            signedAt: null,
            signatureBlobUrl: null,
            signatureMethod: null,
            signingTokenHash: null,
            signingTokenExpiresAt: null,
            signingTokenUsedAt: null,
          }),
        ),
      );

      if (dto.fields?.length) {
        await manager.save(
          EsignFieldEntity,
          dto.fields.map((f) => {
            const signatory = signatories[f.signatoryIndex];
            if (!signatory) {
              throw new BadRequestException({
                code: 'INVALID_SIGNATORY_INDEX',
                message: `signatoryIndex ${f.signatoryIndex} is out of range`,
              });
            }
            return manager.create(EsignFieldEntity, {
              tenantId,
              envelopeId: envelope.id,
              signatoryId: signatory.id,
              fieldType: f.fieldType,
              page: f.page,
              x: f.x,
              y: f.y,
              width: f.width,
              height: f.height,
            });
          }),
        );
      }

      await this.appendEsignAudit(
        manager.getRepository(EsignAuditEventEntity),
        {
          tenantId,
          envelopeId: envelope.id,
          actorId: actor.userId,
          action: EsignAuditAction.CREATED,
          metadata: { title: dto.title, signatoryCount: signatories.length },
        },
      );

      return envelope.id;
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.envelope.create',
      entityType: 'esign_envelope',
      entityId: envelopeId,
      changes: {
        status: { old: null, new: EsignEnvelopeStatus.DRAFT },
        title: { old: null, new: dto.title },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.loadEnvelope(envelopeId, tenantId);
  }

  async findOne(id: string, actor: EsignActor): Promise<EsignEnvelopeEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);
    await this.assertCanAccessEnvelope(envelope, actor);
    return envelope;
  }

  private async loadEnvelope(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<EsignEnvelopeEntity> {
    const envelope = await this.envelopeRepository.findOne({
      where: { id, tenantId },
      relations: ['signatories', 'fields'],
    });

    if (!envelope) {
      throw new NotFoundException({
        code: 'ESIGN_ENVELOPE_NOT_FOUND',
        message: `Envelope ${id} not found`,
      });
    }

    if (envelope.signatories?.length) {
      envelope.signatories.sort((a, b) => a.signingOrder - b.signingOrder);
    }

    return envelope;
  }

  async send(id: string, actor: EsignActor): Promise<EsignEnvelopeEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);

    if (envelope.status !== EsignEnvelopeStatus.DRAFT) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Only draft envelopes can be sent',
      });
    }

    if (!envelope.signatories?.length) {
      throw new BadRequestException({
        code: 'NO_SIGNATORIES',
        message: 'Envelope must have at least one signatory',
      });
    }

    const previous = envelope.status;
    envelope.status = EsignEnvelopeStatus.SENT;
    await this.envelopeRepository.save(envelope);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.SENT,
      metadata: { signatoryCount: envelope.signatories.length },
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.envelope.send',
      entityType: 'esign_envelope',
      entityId: envelope.id,
      changes: {
        status: { old: previous, new: EsignEnvelopeStatus.SENT },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.loadEnvelope(id, tenantId);
  }

  async sign(
    id: string,
    dto: SignEsignEnvelopeDto,
    actor: EsignActor,
  ): Promise<EsignEnvelopeEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);

    if (
      ![
        EsignEnvelopeStatus.SENT,
        EsignEnvelopeStatus.PARTIALLY_SIGNED,
      ].includes(envelope.status)
    ) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Envelope is not open for signing',
      });
    }

    const signatory = envelope.signatories?.find(
      (s) => s.id === dto.signatoryId,
    );
    if (!signatory) {
      throw new NotFoundException({
        code: 'SIGNATORY_NOT_FOUND',
        message: `Signatory ${dto.signatoryId} not found on envelope`,
      });
    }

    await this.assertCanSignAs(signatory, actor);

    if (signatory.status !== EsignSignatoryStatus.PENDING) {
      throw new BadRequestException({
        code: 'SIGNATORY_ALREADY_ACTIONED',
        message: 'Signatory has already signed or declined',
      });
    }

    if (!dto.signatureBlobUrl) {
      throw new BadRequestException({
        code: 'SIGNATURE_REQUIRED',
        message: 'A captured signature image is required',
      });
    }

    signatory.status = EsignSignatoryStatus.SIGNED;
    signatory.signedAt = new Date();
    signatory.signatureBlobUrl = dto.signatureBlobUrl;
    signatory.signatureMethod = EsignSignatureMethod.DRAW;
    await this.signatoryRepository.save(signatory);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.SIGNED,
      metadata: {
        signatoryId: signatory.id,
        email: signatory.email,
      },
    });

    await this.finalizeAfterSign(envelope, actor);
    return this.loadEnvelope(id, tenantId);
  }

  async void(
    id: string,
    dto: VoidEsignEnvelopeDto,
    actor: EsignActor,
  ): Promise<EsignEnvelopeEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);

    if (
      [EsignEnvelopeStatus.COMPLETED, EsignEnvelopeStatus.VOIDED].includes(
        envelope.status,
      )
    ) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Completed or already voided envelopes cannot be voided',
      });
    }

    const previous = envelope.status;
    envelope.status = EsignEnvelopeStatus.VOIDED;
    envelope.voidedReason = dto.reason ?? null;
    await this.envelopeRepository.save(envelope);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.VOIDED,
      metadata: { reason: dto.reason ?? null, previousStatus: previous },
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.envelope.void',
      entityType: 'esign_envelope',
      entityId: envelope.id,
      changes: {
        status: { old: previous, new: EsignEnvelopeStatus.VOIDED },
        voidedReason: { old: null, new: dto.reason ?? null },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.loadEnvelope(id, tenantId);
  }

  async getAudit(
    id: string,
    actor: EsignActor,
  ): Promise<EsignAuditEventEntity[]> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);
    await this.assertCanAccessEnvelope(envelope, actor);

    return this.esignAuditRepository.find({
      where: { envelopeId: id, tenantId },
      order: { createdAt: 'ASC' },
    });
  }

  /** FLW-DOC-003 peer path — export PDF for wet signature. */
  async exportPdf(
    id: string,
    actor: EsignActor,
  ): Promise<{
    envelopeId: string;
    documentBlobUrl: string | null;
    exportStub: true;
  }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);

    if (
      [EsignEnvelopeStatus.VOIDED, EsignEnvelopeStatus.EXPIRED].includes(
        envelope.status,
      )
    ) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Cannot export voided or expired envelopes',
      });
    }

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.EXPORTED,
      metadata: { documentBlobUrl: envelope.documentBlobUrl },
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.envelope.export_pdf',
      entityType: 'esign_envelope',
      entityId: envelope.id,
      changes: {
        exported: { old: null, new: true },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return {
      envelopeId: envelope.id,
      documentBlobUrl: envelope.documentBlobUrl,
      exportStub: true,
    };
  }

  /** FLW-DOC-003 peer path — upload wet-signed copy. */
  async manualUpload(
    id: string,
    dto: ManualUploadEsignDto,
    actor: EsignActor,
  ): Promise<EsignEnvelopeEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);

    if (
      [EsignEnvelopeStatus.VOIDED, EsignEnvelopeStatus.EXPIRED].includes(
        envelope.status,
      )
    ) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Cannot upload to voided or expired envelopes',
      });
    }

    const previous = envelope.status;
    envelope.signedCopyBlobUrl = dto.signedCopyBlobUrl;
    envelope.status = EsignEnvelopeStatus.COMPLETED;
    envelope.completedAt = new Date();

    for (const signatory of envelope.signatories ?? []) {
      if (signatory.status === EsignSignatoryStatus.PENDING) {
        signatory.status = EsignSignatoryStatus.SIGNED;
        signatory.signedAt = new Date();
        signatory.signatureMethod = EsignSignatureMethod.MANUAL_UPLOAD;
        signatory.signatureBlobUrl = dto.signedCopyBlobUrl;
        await this.signatoryRepository.save(signatory);
      }
    }

    await this.envelopeRepository.save(envelope);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.MANUAL_UPLOAD,
      metadata: {
        signedCopyBlobUrl: dto.signedCopyBlobUrl,
        notes: dto.notes ?? null,
        signingMethod: EsignSignatureMethod.MANUAL_UPLOAD,
      },
    });

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.COMPLETED,
      metadata: { via: 'manual_upload' },
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.envelope.manual_upload',
      entityType: 'esign_envelope',
      entityId: envelope.id,
      changes: {
        status: { old: previous, new: EsignEnvelopeStatus.COMPLETED },
        signedCopyBlobUrl: { old: null, new: dto.signedCopyBlobUrl },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    await this.generateCertificateOfCompletion(envelope.id, actor);
    await this.enqueueSeal(envelope.id, tenantId);

    return this.loadEnvelope(id, tenantId);
  }

  /** Generates and stores the Certificate of Completion PDF (FLW-DOC-003). */
  async generateCertificateOfCompletion(
    id: string,
    actor: EsignActor,
  ): Promise<{
    envelopeId: string;
    certificateBlobUrl: string;
    auditEvents: EsignAuditEventEntity[];
  }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(id, tenantId);
    await this.assertCanAccessEnvelope(envelope, actor);
    return this.writeCertificateOfCompletion(envelope, actor);
  }

  /** Contractor email-verified signing token (opaque; hash stored). */
  async issueSigningToken(
    envelopeId: string,
    dto: IssueSigningTokenDto,
    actor: EsignActor,
  ): Promise<{ token: string; expiresAt: string; signatoryId: string }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const envelope = await this.loadEnvelope(envelopeId, tenantId);

    if (
      ![
        EsignEnvelopeStatus.SENT,
        EsignEnvelopeStatus.PARTIALLY_SIGNED,
      ].includes(envelope.status)
    ) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Tokens only issued for open envelopes',
      });
    }

    const signatory = envelope.signatories?.find(
      (s) => s.id === dto.signatoryId,
    );
    if (!signatory) {
      throw new NotFoundException({
        code: 'SIGNATORY_NOT_FOUND',
        message: `Signatory ${dto.signatoryId} not found`,
      });
    }

    if (signatory.status !== EsignSignatoryStatus.PENDING) {
      throw new BadRequestException({
        code: 'SIGNATORY_ALREADY_ACTIONED',
        message: 'Cannot issue token for actioned signatory',
      });
    }

    const { rawToken, expiresAt } = await this.mintSigningToken(
      signatory,
      envelope,
      dto.ttlHours,
      actor,
    );

    const signingUrl = this.buildSigningUrl(rawToken);
    await this.mailService.sendEsignSigningInviteMail({
      email: signatory.email,
      recipientName: signatory.name ?? signatory.email,
      documentTitle: envelope.title,
      url: signingUrl,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      token: rawToken,
      expiresAt: expiresAt.toISOString(),
      signatoryId: signatory.id,
    };
  }

  private async mintSigningToken(
    signatory: EsignSignatoryEntity,
    envelope: EsignEnvelopeEntity,
    ttlHours: number | undefined,
    actor: EsignActor,
  ): Promise<{ rawToken: string; expiresAt: Date }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const rawToken = randomBytes(32).toString('base64url');
    const hash = this.hashToken(rawToken);
    const hours = ttlHours ?? DEFAULT_TOKEN_TTL_HOURS;
    const expiresAt = new Date();
    expiresAt.setUTCHours(expiresAt.getUTCHours() + hours);

    signatory.signingTokenHash = hash;
    signatory.signingTokenExpiresAt = expiresAt;
    signatory.signingTokenUsedAt = null;
    await this.signatoryRepository.save(signatory);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.TOKEN_ISSUED,
      metadata: {
        signatoryId: signatory.id,
        email: signatory.email,
        expiresAt: expiresAt.toISOString(),
      },
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.signing_token.issue',
      entityType: 'esign_signatory',
      entityId: signatory.id,
      changes: {
        tokenIssued: { old: null, new: true },
        expiresAt: { old: null, new: expiresAt.toISOString() },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { rawToken, expiresAt };
  }

  async validateSigningToken(token: string): Promise<{
    envelopeId: string;
    signatoryId: string;
    email: string;
    title: string;
    status: EsignEnvelopeStatus;
  }> {
    const signatory = await this.findSignatoryByToken(token);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId: signatory.tenantId,
      envelopeId: signatory.envelopeId,
      actorId: null,
      action: EsignAuditAction.TOKEN_VALIDATED,
      metadata: { signatoryId: signatory.id },
    });

    const envelope = await this.loadEnvelope(
      signatory.envelopeId,
      signatory.tenantId,
    );

    return {
      envelopeId: envelope.id,
      signatoryId: signatory.id,
      email: signatory.email,
      title: envelope.title,
      status: envelope.status,
    };
  }

  async completeWithToken(
    dto: CompleteSigningWithTokenDto,
    ipAddress?: string,
  ): Promise<EsignEnvelopeEntity> {
    const signatory = await this.findSignatoryByToken(dto.token);
    const actor: EsignActor = {
      userId: `token:${signatory.id}`,
      tenantId: signatory.tenantId,
      ipAddress,
    };

    const envelope = await this.loadEnvelope(
      signatory.envelopeId,
      signatory.tenantId,
    );

    if (
      ![
        EsignEnvelopeStatus.SENT,
        EsignEnvelopeStatus.PARTIALLY_SIGNED,
      ].includes(envelope.status)
    ) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Envelope is not open for signing',
      });
    }

    if (!dto.signatureBlobUrl) {
      throw new BadRequestException({
        code: 'SIGNATURE_REQUIRED',
        message: 'A captured signature image is required',
      });
    }

    signatory.status = EsignSignatoryStatus.SIGNED;
    signatory.signedAt = new Date();
    signatory.signatureBlobUrl = dto.signatureBlobUrl;
    signatory.signatureMethod = EsignSignatureMethod.DRAW;
    signatory.signingTokenUsedAt = new Date();
    signatory.signingTokenHash = null;
    await this.signatoryRepository.save(signatory);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId: signatory.tenantId,
      envelopeId: envelope.id,
      actorId: null,
      action: EsignAuditAction.SIGNED,
      metadata: {
        signatoryId: signatory.id,
        via: 'signing_token',
        email: signatory.email,
      },
    });

    await this.finalizeAfterSign(envelope, actor);
    return this.loadEnvelope(envelope.id, signatory.tenantId);
  }

  /**
   * BullMQ job handler — send reminder emails and expire envelopes.
   */
  async processReminderAndExpiryScan(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{ remindersQueued: number; expired: number }> {
    const now = new Date();
    let remindersQueued = 0;
    let expired = 0;

    const openEnvelopes = await this.envelopeRepository.find({
      where: {
        tenantId,
        status: In([
          EsignEnvelopeStatus.SENT,
          EsignEnvelopeStatus.PARTIALLY_SIGNED,
        ]),
      },
      relations: ['signatories'],
    });

    for (const envelope of openEnvelopes) {
      if (envelope.expiresAt && envelope.expiresAt < now) {
        envelope.status = EsignEnvelopeStatus.EXPIRED;
        await this.envelopeRepository.save(envelope);
        await this.appendEsignAudit(this.esignAuditRepository, {
          tenantId,
          envelopeId: envelope.id,
          actorId: null,
          action: EsignAuditAction.EXPIRED,
          metadata: { expiresAt: envelope.expiresAt.toISOString() },
        });
        expired += 1;
        continue;
      }

      const pending = (envelope.signatories ?? []).filter(
        (s) => s.status === EsignSignatoryStatus.PENDING,
      );
      if (!pending.length) {
        continue;
      }

      const lastReminder = envelope.lastReminderAt?.getTime() ?? 0;
      const dayMs = 24 * 60 * 60 * 1000;
      if (now.getTime() - lastReminder < dayMs) {
        continue;
      }

      envelope.lastReminderAt = now;
      await this.envelopeRepository.save(envelope);

      for (const signatory of pending) {
        const { rawToken } = await this.mintSigningToken(
          signatory,
          envelope,
          DEFAULT_TOKEN_TTL_HOURS,
          { userId: SYSTEM_ACTOR_ID, tenantId },
        );
        await this.mailService.sendEsignReminderMail({
          email: signatory.email,
          recipientName: signatory.name ?? signatory.email,
          documentTitle: envelope.title,
          url: this.buildSigningUrl(rawToken),
        });
      }

      await this.appendEsignAudit(this.esignAuditRepository, {
        tenantId,
        envelopeId: envelope.id,
        actorId: null,
        action: EsignAuditAction.REMINDER_QUEUED,
        metadata: {
          pendingSignatoryIds: pending.map((s) => s.id),
          emailsSent: pending.map((s) => s.email),
        },
      });

      remindersQueued += 1;
    }

    return { remindersQueued, expired };
  }

  private buildSigningUrl(token: string): string {
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/en/esign/sign?token=${encodeURIComponent(token)}`;
  }

  /** Worker entry — real PAdES seal via Key Vault (or env-gated no-op). */
  async processSealJob(
    envelopeId: string,
    tenantId: string,
  ): Promise<PadesSealResult> {
    const envelope = await this.loadEnvelope(envelopeId, tenantId);
    const result = await this.padesSealing.seal({
      envelopeId,
      tenantId,
      documentBlobUrl: envelope.documentBlobUrl ?? envelope.signedCopyBlobUrl,
    });

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId,
      actorId: null,
      action: result.sealed
        ? EsignAuditAction.SEALED
        : EsignAuditAction.SEAL_SKIPPED,
      metadata: {
        sealed: result.sealed,
        reason: result.reason,
        configured: this.padesSealing.isConfigured(),
      },
    });

    if (result.sealed && result.sealedBlobUrl) {
      envelope.sealedBlobUrl = result.sealedBlobUrl;
      await this.envelopeRepository.save(envelope);

      await this.auditLogService.append({
        tenantId,
        actorId: null,
        action: 'esign.envelope.seal',
        entityType: 'esign_envelope',
        entityId: envelope.id,
        changes: {
          sealedBlobUrl: { old: null, new: result.sealedBlobUrl },
        },
      });
    }

    return result;
  }

  async listPendingForWorker(
    workerId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<EsignEnvelopeEntity[]> {
    try {
      const signatories = await this.signatoryRepository.find({
        where: {
          tenantId,
          workerId,
          status: EsignSignatoryStatus.PENDING,
        },
      });
      if (!signatories.length) {
        return [];
      }
      return this.envelopeRepository.find({
        where: {
          tenantId,
          id: In(signatories.map((s) => s.envelopeId)),
          status: In([
            EsignEnvelopeStatus.SENT,
            EsignEnvelopeStatus.PARTIALLY_SIGNED,
          ]),
        },
        order: { createdAt: 'DESC' },
      });
    } catch {
      return [];
    }
  }

  private async finalizeAfterSign(
    envelope: EsignEnvelopeEntity,
    actor: EsignActor,
  ): Promise<void> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const allSignatories = await this.signatoryRepository.find({
      where: { envelopeId: envelope.id, tenantId },
    });
    const allSigned = allSignatories.every(
      (s) => s.status === EsignSignatoryStatus.SIGNED,
    );
    const previousStatus = envelope.status;

    if (allSigned) {
      envelope.status = EsignEnvelopeStatus.COMPLETED;
      envelope.completedAt = new Date();
      await this.envelopeRepository.save(envelope);

      await this.appendEsignAudit(this.esignAuditRepository, {
        tenantId,
        envelopeId: envelope.id,
        actorId: actor.userId,
        action: EsignAuditAction.COMPLETED,
        metadata: { completedAt: envelope.completedAt.toISOString() },
      });

      await this.writeCertificateOfCompletion(envelope, actor);
      await this.enqueueSeal(envelope.id, tenantId);
    } else {
      envelope.status = EsignEnvelopeStatus.PARTIALLY_SIGNED;
      await this.envelopeRepository.save(envelope);
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.envelope.sign',
      entityType: 'esign_envelope',
      entityId: envelope.id,
      changes: {
        status: { old: previousStatus, new: envelope.status },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
  }

  private async enqueueSeal(
    envelopeId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      await this.esignQueue.add(
        JobEnum.Esign.SealPades,
        { envelopeId, tenantId },
        { jobId: `seal-${envelopeId}`, attempts: 3 },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue PAdES seal for ${envelopeId}: ${(err as Error).message}`,
      );
    }
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async findSignatoryByToken(
    token: string,
  ): Promise<EsignSignatoryEntity> {
    if (!token?.trim()) {
      throw new UnauthorizedException({
        code: 'INVALID_SIGNING_TOKEN',
        message: 'Signing token is required',
      });
    }

    const hash = this.hashToken(token);
    const signatory = await this.signatoryRepository.findOne({
      where: { signingTokenHash: hash },
    });

    if (!signatory) {
      throw new UnauthorizedException({
        code: 'INVALID_SIGNING_TOKEN',
        message: 'Signing token is invalid',
      });
    }

    if (
      signatory.signingTokenExpiresAt &&
      signatory.signingTokenExpiresAt < new Date()
    ) {
      throw new UnauthorizedException({
        code: 'SIGNING_TOKEN_EXPIRED',
        message: 'Signing token has expired',
      });
    }

    if (signatory.signingTokenUsedAt) {
      throw new UnauthorizedException({
        code: 'SIGNING_TOKEN_USED',
        message: 'Signing token has already been used',
      });
    }

    if (signatory.status !== EsignSignatoryStatus.PENDING) {
      throw new BadRequestException({
        code: 'SIGNATORY_ALREADY_ACTIONED',
        message: 'Signatory has already signed or declined',
      });
    }

    return signatory;
  }

  private async writeCertificateOfCompletion(
    envelope: EsignEnvelopeEntity,
    actor: EsignActor,
  ): Promise<{
    envelopeId: string;
    certificateBlobUrl: string;
    auditEvents: EsignAuditEventEntity[];
  }> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;

    if (envelope.status !== EsignEnvelopeStatus.COMPLETED) {
      throw new BadRequestException({
        code: 'INVALID_ENVELOPE_STATUS',
        message: 'Certificate requires a completed envelope',
      });
    }

    const auditEvents = await this.esignAuditRepository.find({
      where: { envelopeId: envelope.id, tenantId },
      order: { createdAt: 'ASC' },
    });

    const signatories = envelope.signatories ?? [];
    const certificatePdf = await buildCertificateOfCompletionPdf({
      envelopeId: envelope.id,
      title: envelope.title,
      status: envelope.status,
      completedAt: envelope.completedAt?.toISOString() ?? null,
      signatories: signatories.map((s) => ({
        name: s.name,
        email: s.email,
        status: s.status,
        signedAt: s.signedAt?.toISOString() ?? null,
        signatureMethod: s.signatureMethod,
      })),
      auditEvents: auditEvents.map((e) => ({
        action: e.action,
        createdAt: e.createdAt.toISOString(),
      })),
    });

    const certificateBlobUrl = await this.blobStorage.upload(
      certificatePdf,
      'esign/certificates',
      `${envelope.id}-certificate.pdf`,
    );

    envelope.certificateBlobUrl = certificateBlobUrl;
    await this.envelopeRepository.save(envelope);

    await this.appendEsignAudit(this.esignAuditRepository, {
      tenantId,
      envelopeId: envelope.id,
      actorId: actor.userId,
      action: EsignAuditAction.CERTIFICATE_GENERATED,
      metadata: {
        certificateBlobUrl,
        eventCount: auditEvents.length,
        signatoryCount: signatories.length,
      },
    });

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'esign.certificate.generate',
      entityType: 'esign_envelope',
      entityId: envelope.id,
      changes: {
        certificateBlobUrl: { old: null, new: certificateBlobUrl },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return { envelopeId: envelope.id, certificateBlobUrl, auditEvents };
  }

  private async isEsignManager(
    userId: string,
    tenantId: string,
  ): Promise<boolean> {
    const auth = await this.rbacService.getAuthContext(userId, tenantId);
    return auth.roleCodes.some((code) =>
      [PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN].includes(
        code as PolarisRoleCode,
      ),
    );
  }

  private async assertCanAccessEnvelope(
    envelope: EsignEnvelopeEntity,
    actor: EsignActor,
  ): Promise<void> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    if (await this.isEsignManager(actor.userId, tenantId)) return;
    const workerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );
    const isSignatory =
      !!workerId &&
      (envelope.signatories ?? []).some((s) => s.workerId === workerId);
    if (!isSignatory) {
      throw new ForbiddenException({
        code: 'ESIGN_FORBIDDEN',
        message: 'You do not have access to this envelope',
      });
    }
  }

  private async assertCanSignAs(
    signatory: EsignSignatoryEntity,
    actor: EsignActor,
  ): Promise<void> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    const workerId = await resolveActingWorkerId(
      this.workerRepository,
      actor.userId,
      tenantId,
    );
    if (!workerId || signatory.workerId !== workerId) {
      throw new ForbiddenException({
        code: 'ESIGN_SIGN_FORBIDDEN',
        message: 'You can only sign as yourself',
      });
    }
  }

  private async appendEsignAudit(
    repo: Repository<EsignAuditEventEntity>,
    input: {
      tenantId: string;
      envelopeId: string;
      actorId: string | null;
      action: string;
      metadata: Record<string, unknown>;
    },
  ): Promise<void> {
    await repo.save(
      repo.create({
        tenantId: input.tenantId,
        envelopeId: input.envelopeId,
        actorId: input.actorId,
        action: input.action,
        metadata: input.metadata,
      }),
    );
  }
}
