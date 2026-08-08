import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  CANDIDATE_ACTOR_ID,
  DIGITARO_TENANT_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { MailService } from '@/shared/mail/mail.service';
import { File } from '@nest-lab/fastify-multer';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import {
  CandidateUpsertPreBoardingFieldDto,
  CreatePreBoardingPacketDto,
  UpsertPreBoardingFieldDto,
} from './dto/pre-boarding.dto';
import { PreBoardingFieldValueEntity } from './entities/pre-boarding-field-value.entity';
import { PreBoardingPacketEntity } from './entities/pre-boarding-packet.entity';
import { PreBoardingPacketStatus } from './enums/onboarding.enum';
import { PreBoardingBlobStorageService } from './pre-boarding-blob-storage.service';

type ActorContext = {
  userId: string;
  tenantId?: string;
  correlationId?: string;
  ipAddress?: string;
};

const ACCESS_TOKEN_TTL_DAYS = 30;

const CANDIDATE_EDITABLE_STATUSES = [
  PreBoardingPacketStatus.INVITED,
  PreBoardingPacketStatus.IN_PROGRESS,
];

@Injectable()
export class PreBoardingService {
  constructor(
    @InjectRepository(PreBoardingPacketEntity)
    private readonly packetRepository: Repository<PreBoardingPacketEntity>,
    @InjectRepository(PreBoardingFieldValueEntity)
    private readonly fieldRepository: Repository<PreBoardingFieldValueEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
    private readonly mailService: MailService,
    private readonly blobStorageService: PreBoardingBlobStorageService,
  ) {}

  // ---------------------------------------------------------------------
  // People Ops (session-authenticated)
  // ---------------------------------------------------------------------

  async createPacket(
    dto: CreatePreBoardingPacketDto,
    actor: ActorContext,
  ): Promise<PreBoardingPacketEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);

    const worker = await this.workerRepository.findOne({
      where: { id: dto.workerId, tenantId },
    });
    if (!worker) {
      throw new NotFoundException({
        code: 'WORKER_NOT_FOUND',
        message: 'Worker not found',
      });
    }

    const packet = await this.packetRepository.save(
      this.packetRepository.create({
        tenantId,
        workerId: dto.workerId,
        candidateId: dto.candidateId ?? null,
        personalEmail: dto.personalEmail.toLowerCase(),
        status: PreBoardingPacketStatus.DRAFT,
        consentAt: null,
        consentIp: null,
        templateVersionId: dto.templateVersionId ?? null,
        submittedAt: null,
        mergedAt: null,
        correlationId: actor.correlationId ?? null,
        accessTokenHash: null,
        accessTokenExpiresAt: null,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'pre_boarding.packet.create',
      entityType: 'pre_boarding_packet',
      entityId: packet.id,
      changes: {
        workerId: { old: null, new: dto.workerId },
        status: { old: null, new: PreBoardingPacketStatus.DRAFT },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.getPacketOrFail(packet.id, tenantId);
  }

  async getPacket(
    id: string,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PreBoardingPacketEntity> {
    await this.assertPeopleOps(actorId, tenantId);
    return this.getPacketOrFail(id, tenantId);
  }

  async listPackets(
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<PreBoardingPacketEntity[]> {
    await this.assertPeopleOps(actorId, tenantId);
    return this.packetRepository.find({
      where: { tenantId },
      relations: ['worker'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * FLW-TAL-006 — issue a candidate magic-link token (hashed at rest, 30-day
   * TTL) and send the real invite email via MailService. Raw token is never
   * returned by the API — only ever delivered via email.
   */
  async invite(
    id: string,
    actor: ActorContext,
  ): Promise<PreBoardingPacketEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);
    const packet = await this.getPacketOrFail(id, tenantId);

    if (packet.status === PreBoardingPacketStatus.CANCELLED) {
      throw new BadRequestException({
        code: 'PACKET_CANCELLED',
        message: 'Cannot invite a cancelled packet',
      });
    }

    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + ACCESS_TOKEN_TTL_DAYS);

    const previousStatus = packet.status;
    packet.accessTokenHash = this.hashToken(rawToken);
    packet.accessTokenExpiresAt = expiresAt;
    if (packet.status === PreBoardingPacketStatus.DRAFT) {
      packet.status = PreBoardingPacketStatus.INVITED;
    }
    await this.packetRepository.save(packet);

    const worker =
      packet.worker ??
      (await this.workerRepository.findOne({
        where: { id: packet.workerId, tenantId },
      }));
    const workerName = worker
      ? `${worker.firstName} ${worker.lastName}`.trim()
      : 'there';
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    let emailSent = false;
    let emailError: string | null = null;
    try {
      await this.mailService.sendPreBoardingInviteMail({
        email: packet.personalEmail,
        workerName,
        url: `${baseUrl}/pre-boarding/${rawToken}`,
        expiresInDays: ACCESS_TOKEN_TTL_DAYS,
      });
      emailSent = true;
    } catch (error) {
      emailError = error instanceof Error ? error.message : 'mail_send_failed';
    }

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'pre_boarding.packet.invite',
      entityType: 'pre_boarding_packet',
      entityId: packet.id,
      changes: {
        status: { old: previousStatus, new: packet.status },
        accessTokenIssued: { old: null, new: true },
        accessTokenExpiresAt: { old: null, new: expiresAt.toISOString() },
        magicLinkSend: { old: null, new: emailSent ? 'sent' : 'failed' },
        ...(emailError
          ? { magicLinkSendError: { old: null, new: emailError } }
          : {}),
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return this.getPacketOrFail(id, tenantId);
  }

  async upsertField(
    packetId: string,
    dto: UpsertPreBoardingFieldDto,
    actor: ActorContext,
  ): Promise<PreBoardingFieldValueEntity> {
    const tenantId = actor.tenantId ?? DIGITARO_TENANT_ID;
    await this.assertPeopleOps(actor.userId, tenantId);
    await this.getPacketOrFail(packetId, tenantId);

    return this.saveFieldValue(
      tenantId,
      packetId,
      dto.fieldKey,
      dto.valueText ?? null,
      dto.attachmentBlobId ?? null,
      actor,
    );
  }

  // ---------------------------------------------------------------------
  // Candidate (magic-link token authenticated — no Better Auth session)
  // ---------------------------------------------------------------------

  async getPacketForCandidate(token: string): Promise<PreBoardingPacketEntity> {
    return this.resolvePacketByToken(token);
  }

  async submitConsentAsCandidate(
    token: string,
    acknowledged: boolean,
    ipAddress?: string,
  ): Promise<PreBoardingPacketEntity> {
    const packet = await this.resolvePacketByToken(token);

    if (!acknowledged) {
      throw new BadRequestException({
        code: 'CONSENT_NOT_ACKNOWLEDGED',
        message: 'Consent must be acknowledged to proceed',
      });
    }

    const previousStatus = packet.status;
    packet.consentAt = new Date();
    packet.consentIp = ipAddress ?? null;
    if (packet.status === PreBoardingPacketStatus.INVITED) {
      packet.status = PreBoardingPacketStatus.IN_PROGRESS;
    }
    await this.packetRepository.save(packet);

    await this.auditLogService.append({
      tenantId: packet.tenantId,
      actorId: CANDIDATE_ACTOR_ID,
      action: 'pre_boarding.consent.submit',
      entityType: 'pre_boarding_packet',
      entityId: packet.id,
      changes: {
        consentAt: { old: null, new: packet.consentAt.toISOString() },
        status: { old: previousStatus, new: packet.status },
      },
      ipAddress,
    });

    return this.getPacketOrFail(packet.id, packet.tenantId);
  }

  async upsertFieldAsCandidate(
    token: string,
    dto: CandidateUpsertPreBoardingFieldDto,
    ipAddress?: string,
  ): Promise<PreBoardingFieldValueEntity> {
    const packet = await this.resolvePacketByToken(token);
    this.assertCandidateCanEdit(packet);

    return this.saveFieldValue(
      packet.tenantId,
      packet.id,
      dto.fieldKey,
      dto.valueText ?? null,
      null,
      { userId: CANDIDATE_ACTOR_ID, tenantId: packet.tenantId, ipAddress },
    );
  }

  async uploadAttachmentAsCandidate(
    token: string,
    fieldKey: string,
    file: File,
    ipAddress?: string,
  ): Promise<PreBoardingFieldValueEntity> {
    const packet = await this.resolvePacketByToken(token);
    this.assertCandidateCanEdit(packet);

    if (!file?.buffer?.length) {
      throw new BadRequestException({
        code: 'ATTACHMENT_REQUIRED',
        message: 'A file is required',
      });
    }
    if (!fieldKey?.trim()) {
      throw new BadRequestException({
        code: 'FIELD_KEY_REQUIRED',
        message: 'fieldKey query parameter is required',
      });
    }

    const url = await this.blobStorageService.upload(file, 'pre-boarding');

    return this.saveFieldValue(
      packet.tenantId,
      packet.id,
      fieldKey,
      url,
      null,
      { userId: CANDIDATE_ACTOR_ID, tenantId: packet.tenantId, ipAddress },
    );
  }

  async submitPacketAsCandidate(
    token: string,
    ipAddress?: string,
  ): Promise<PreBoardingPacketEntity> {
    const packet = await this.resolvePacketByToken(token);
    this.assertCandidateCanEdit(packet);

    if (!packet.consentAt) {
      throw new BadRequestException({
        code: 'CONSENT_REQUIRED',
        message: 'Consent must be submitted before the packet can be finalised',
      });
    }

    const previousStatus = packet.status;
    packet.status = PreBoardingPacketStatus.SUBMITTED;
    packet.submittedAt = new Date();
    await this.packetRepository.save(packet);

    await this.auditLogService.append({
      tenantId: packet.tenantId,
      actorId: CANDIDATE_ACTOR_ID,
      action: 'pre_boarding.packet.submit',
      entityType: 'pre_boarding_packet',
      entityId: packet.id,
      changes: {
        status: { old: previousStatus, new: PreBoardingPacketStatus.SUBMITTED },
        submittedAt: { old: null, new: packet.submittedAt.toISOString() },
      },
      ipAddress,
    });

    return this.getPacketOrFail(packet.id, packet.tenantId);
  }

  /**
   * Resolves a packet by its raw magic-link token — validates hash match,
   * expiry, and that the packet hasn't been cancelled. Used by every
   * candidate-facing endpoint; throws 401 on any invalid/expired token so
   * callers can't distinguish "not found" from "expired" (avoids leaking
   * packet existence).
   */
  private async resolvePacketByToken(
    token: string,
  ): Promise<PreBoardingPacketEntity> {
    if (!token?.trim()) {
      throw new UnauthorizedException({
        code: 'INVALID_PRE_BOARDING_TOKEN',
        message: 'Pre-boarding token is required',
      });
    }

    const hash = this.hashToken(token);
    const packet = await this.packetRepository.findOne({
      where: { accessTokenHash: hash },
      relations: ['fieldValues', 'worker'],
    });

    if (!packet) {
      throw new UnauthorizedException({
        code: 'INVALID_PRE_BOARDING_TOKEN',
        message: 'Pre-boarding token is invalid',
      });
    }

    if (
      packet.accessTokenExpiresAt &&
      packet.accessTokenExpiresAt < new Date()
    ) {
      throw new UnauthorizedException({
        code: 'PRE_BOARDING_TOKEN_EXPIRED',
        message: 'Pre-boarding token has expired',
      });
    }

    if (packet.status === PreBoardingPacketStatus.CANCELLED) {
      throw new UnauthorizedException({
        code: 'PRE_BOARDING_PACKET_CANCELLED',
        message: 'This pre-boarding packet is no longer active',
      });
    }

    return packet;
  }

  private assertCandidateCanEdit(packet: PreBoardingPacketEntity): void {
    if (!CANDIDATE_EDITABLE_STATUSES.includes(packet.status)) {
      throw new BadRequestException({
        code: 'PACKET_NOT_EDITABLE',
        message: `Packet cannot be edited while status is ${packet.status}`,
      });
    }
  }

  private async saveFieldValue(
    tenantId: string,
    packetId: string,
    fieldKey: string,
    valueText: string | null,
    attachmentBlobId: string | null,
    actor: ActorContext,
  ): Promise<PreBoardingFieldValueEntity> {
    let field = await this.fieldRepository.findOne({
      where: { tenantId, packetId, fieldKey },
    });

    if (!field) {
      field = this.fieldRepository.create({
        tenantId,
        packetId,
        fieldKey,
        valueEncrypted: null,
        valueText,
        attachmentBlobId,
      });
    } else {
      field.valueText = valueText ?? field.valueText;
      field.attachmentBlobId = attachmentBlobId ?? field.attachmentBlobId;
    }

    const saved = await this.fieldRepository.save(field);

    await this.auditLogService.append({
      tenantId,
      actorId: actor.userId,
      action: 'pre_boarding.field.upsert',
      entityType: 'pre_boarding_field_value',
      entityId: saved.id,
      changes: {
        fieldKey: { old: null, new: fieldKey },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });

    return saved;
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async getPacketOrFail(
    id: string,
    tenantId: string,
  ): Promise<PreBoardingPacketEntity> {
    const packet = await this.packetRepository.findOne({
      where: { id, tenantId },
      relations: ['fieldValues', 'worker'],
    });
    if (!packet) {
      throw new NotFoundException({
        code: 'PRE_BOARDING_PACKET_NOT_FOUND',
        message: 'Pre-boarding packet not found',
      });
    }
    return packet;
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
        code: 'PRE_BOARDING_ACCESS_DENIED',
        message: 'People Ops access required',
      });
    }
  }
}
