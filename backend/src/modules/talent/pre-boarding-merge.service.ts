import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  DIGITARO_TENANT_ID,
  SYSTEM_ACTOR_ID,
} from '@/modules/compliance/constants/tenant.constants';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PRE_BOARDING_PASSPORT_FIELD_KEYS,
  PRE_BOARDING_VISA_REQUIRED_FIELD_KEYS,
  PreBoardingFieldKey,
} from './constants/pre-boarding-field-keys.constant';
import { PreBoardingFieldValueEntity } from './entities/pre-boarding-field-value.entity';
import { PreBoardingPacketEntity } from './entities/pre-boarding-packet.entity';
import { WorkerPassportEntity } from './entities/worker-passport.entity';
import { WorkerVisaRecordEntity } from './entities/worker-visa-record.entity';
import {
  PassportSource,
  PreBoardingPacketStatus,
  VisaRecordType,
} from './enums/onboarding.enum';
import { OnboardingService } from './onboarding.service';

export type PreBoardingMergeResult = {
  packetId: string;
  workerId: string;
  passportCreated: boolean;
  visaRecordCreated: boolean;
  onboardingCaseCreated: boolean;
  skipped: boolean;
  reason?: string;
};

const MERGEABLE_STATUSES = [
  PreBoardingPacketStatus.SUBMITTED,
  PreBoardingPacketStatus.UNDER_REVIEW,
  PreBoardingPacketStatus.APPROVED,
];

@Injectable()
export class PreBoardingMergeService {
  private readonly logger = new Logger(PreBoardingMergeService.name);

  constructor(
    @InjectRepository(PreBoardingPacketEntity)
    private readonly packetRepository: Repository<PreBoardingPacketEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    @InjectRepository(WorkerPassportEntity)
    private readonly passportRepository: Repository<WorkerPassportEntity>,
    @InjectRepository(WorkerVisaRecordEntity)
    private readonly visaRepository: Repository<WorkerVisaRecordEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly onboardingService: OnboardingService,
  ) {}

  /**
   * Daily cron entry point — finds submitted/approved packets for workers
   * whose start date has arrived and merges each one. Idempotent: packets
   * with `mergedAt` set are excluded from the query.
   */
  async runDailyMergeScan(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<{ merged: number; skipped: number }> {
    const today = new Date().toISOString().slice(0, 10);

    const packets = await this.packetRepository
      .createQueryBuilder('packet')
      .innerJoinAndSelect('packet.worker', 'worker')
      .leftJoinAndSelect('packet.fieldValues', 'fieldValues')
      .where('packet.tenantId = :tenantId', { tenantId })
      .andWhere('packet.mergedAt IS NULL')
      .andWhere('packet.status IN (:...statuses)', {
        statuses: MERGEABLE_STATUSES,
      })
      .andWhere('worker.startDate <= :today', { today })
      .getMany();

    let merged = 0;
    let skipped = 0;

    for (const packet of packets) {
      const result = await this.mergePacket(packet.id, tenantId);
      if (result.skipped) {
        skipped += 1;
      } else {
        merged += 1;
      }
    }

    this.logger.log(
      `Pre-boarding merge scan for ${today}: merged ${merged}, skipped ${skipped} (of ${packets.length} candidates)`,
    );
    return { merged, skipped };
  }

  /**
   * FLW-TAL-006 — merge one packet's fields into the worker profile, create
   * worker_passports / worker_visa_records from submitted immigration
   * fields, set `mergedAt`, and trigger day-1 onboarding. Safe to call
   * multiple times: no-ops (skipped=true) once `mergedAt` is set.
   */
  async mergePacket(
    packetId: string,
    tenantId: string = DIGITARO_TENANT_ID,
    correlationId?: string,
  ): Promise<PreBoardingMergeResult> {
    const packet = await this.packetRepository.findOne({
      where: { id: packetId, tenantId },
      relations: ['fieldValues', 'worker'],
    });

    if (!packet) {
      this.logger.warn(`mergePacket: packet ${packetId} not found`);
      return {
        packetId,
        workerId: '',
        passportCreated: false,
        visaRecordCreated: false,
        onboardingCaseCreated: false,
        skipped: true,
        reason: 'packet_not_found',
      };
    }

    if (packet.mergedAt) {
      return {
        packetId,
        workerId: packet.workerId,
        passportCreated: false,
        visaRecordCreated: false,
        onboardingCaseCreated: false,
        skipped: true,
        reason: 'already_merged',
      };
    }

    if (!MERGEABLE_STATUSES.includes(packet.status)) {
      return {
        packetId,
        workerId: packet.workerId,
        passportCreated: false,
        visaRecordCreated: false,
        onboardingCaseCreated: false,
        skipped: true,
        reason: `invalid_status:${packet.status}`,
      };
    }

    const worker =
      packet.worker ??
      (await this.workerRepository.findOne({
        where: { id: packet.workerId, tenantId },
      }));
    if (!worker) {
      this.logger.warn(
        `mergePacket: worker ${packet.workerId} not found for packet ${packetId}`,
      );
      return {
        packetId,
        workerId: packet.workerId,
        passportCreated: false,
        visaRecordCreated: false,
        onboardingCaseCreated: false,
        skipped: true,
        reason: 'worker_not_found',
      };
    }

    const fields = this.buildFieldMap(packet.fieldValues ?? []);

    const passport = await this.mergePassport(worker, fields, tenantId);
    const visaRecord = await this.mergeVisaRecord(
      worker,
      fields,
      passport,
      tenantId,
    );
    await this.mergeWorkerProfileFields(worker, fields, tenantId);

    packet.mergedAt = new Date();
    await this.packetRepository.save(packet);

    await this.auditLogService.append({
      tenantId,
      actorId: SYSTEM_ACTOR_ID,
      action: 'pre_boarding.packet.merge',
      entityType: 'pre_boarding_packet',
      entityId: packet.id,
      changes: {
        mergedAt: { old: null, new: packet.mergedAt.toISOString() },
        passportCreated: { old: null, new: Boolean(passport) },
        visaRecordCreated: { old: null, new: Boolean(visaRecord) },
      },
      correlationId,
    });

    const onboardingCase = await this.onboardingService.createCaseSystem(
      worker.id,
      worker.startDate,
      tenantId,
      correlationId,
    );

    return {
      packetId: packet.id,
      workerId: worker.id,
      passportCreated: Boolean(passport),
      visaRecordCreated: Boolean(visaRecord),
      onboardingCaseCreated: Boolean(onboardingCase),
      skipped: false,
    };
  }

  private buildFieldMap(
    fieldValues: PreBoardingFieldValueEntity[],
  ): Map<string, string> {
    const map = new Map<string, string>();
    for (const field of fieldValues) {
      if (field.valueText) {
        map.set(field.fieldKey, field.valueText);
      }
    }
    return map;
  }

  private async mergePassport(
    worker: WorkerEntity,
    fields: Map<string, string>,
    tenantId: string,
  ): Promise<WorkerPassportEntity | null> {
    const hasAllRequired = PRE_BOARDING_PASSPORT_FIELD_KEYS.every((key) =>
      fields.has(key),
    );
    if (!hasAllRequired) {
      return null;
    }

    const existing = await this.passportRepository.findOne({
      where: {
        tenantId,
        workerId: worker.id,
        passportNumber: fields.get(PreBoardingFieldKey.PassportNumber)!,
      },
    });
    if (existing) {
      return existing;
    }

    await this.passportRepository.update(
      { tenantId, workerId: worker.id, isCurrent: true },
      { isCurrent: false },
    );

    return this.passportRepository.save(
      this.passportRepository.create({
        tenantId,
        workerId: worker.id,
        passportNumber: fields.get(PreBoardingFieldKey.PassportNumber)!,
        nationalityCode: fields
          .get(PreBoardingFieldKey.PassportNationalityCode)!
          .toUpperCase(),
        issuingCountryCode: fields
          .get(PreBoardingFieldKey.PassportIssuingCountryCode)!
          .toUpperCase(),
        placeOfIssue:
          fields.get(PreBoardingFieldKey.PassportPlaceOfIssue) ?? null,
        issueDate: fields.get(PreBoardingFieldKey.PassportIssueDate)!,
        expiryDate: fields.get(PreBoardingFieldKey.PassportExpiryDate)!,
        isCurrent: true,
        source: PassportSource.PRE_BOARDING,
      }),
    );
  }

  private async mergeVisaRecord(
    worker: WorkerEntity,
    fields: Map<string, string>,
    passport: WorkerPassportEntity | null,
    tenantId: string,
  ): Promise<WorkerVisaRecordEntity | null> {
    const hasAllRequired = PRE_BOARDING_VISA_REQUIRED_FIELD_KEYS.every((key) =>
      fields.has(key),
    );
    if (!hasAllRequired) {
      return null;
    }

    const countryCode = fields
      .get(PreBoardingFieldKey.PreviousVisaCountryCode)!
      .toUpperCase();
    const statusCode = fields.get(PreBoardingFieldKey.PreviousVisaStatusCode)!;

    const existing = await this.visaRepository.findOne({
      where: {
        tenantId,
        workerId: worker.id,
        countryCode,
        recordType: VisaRecordType.PREVIOUS,
      },
    });
    if (existing) {
      return existing;
    }

    return this.visaRepository.save(
      this.visaRepository.create({
        tenantId,
        workerId: worker.id,
        countryCode,
        recordType: VisaRecordType.PREVIOUS,
        statusCode,
        visaOrPassType:
          fields.get(PreBoardingFieldKey.PreviousVisaOrPassType) ?? null,
        documentNumber:
          fields.get(PreBoardingFieldKey.PreviousVisaDocumentNumber) ?? null,
        sponsorOrEmployer: null,
        uidNumber: null,
        labourCardNumber: null,
        emiratesId: null,
        nric: null,
        ipaReference: null,
        applicationStatus: null,
        issueDate:
          fields.get(PreBoardingFieldKey.PreviousVisaIssueDate) ?? null,
        expiryDate:
          fields.get(PreBoardingFieldKey.PreviousVisaExpiryDate) ?? null,
        cancellationDate: null,
        cancellationReason: null,
        passportId: passport?.id ?? null,
        supersededById: null,
      }),
    );
  }

  private async mergeWorkerProfileFields(
    worker: WorkerEntity,
    fields: Map<string, string>,
    tenantId: string,
  ): Promise<void> {
    const phone = fields.get(PreBoardingFieldKey.PersonalPhone);
    if (phone && !worker.phone) {
      worker.phone = phone;
      await this.workerRepository.save(worker);
      this.logger.debug(
        `Merged personal_phone into worker ${worker.id} profile (tenant ${tenantId})`,
      );
    }
  }
}
