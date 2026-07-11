import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { Job as JobEnum, Queue as QueueEnum } from '@/constants/job.constant';
import { SUPPORTED_COUNTRY_CODES } from '@/modules/country-config/constants/country-config.seed-data';
import { CountryConfigService } from '@/modules/country-config/country-config.service';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import {
  CONTRACTOR_TYPE_CODES,
  STATUTORY_FIELDS_BY_COUNTRY,
} from './constants/statutory-fields.constant';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { CreateWorkerDto } from './dto/create-worker.dto';
import {
  WorkerImportBatchEntity,
  WorkerImportRowResult,
} from './entities/worker-import-batch.entity';
import { WorkerEntity } from './entities/worker.entity';
import {
  WorkerImportBatchStatus,
  WorkerImportRowOutcome,
} from './enums/worker-import.enum';
import { csvToRecords } from './utils/csv-import.util';
import { WorkerService } from './worker.service';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface WorkerImportRowValidation {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  isValid: boolean;
  action: 'create' | 'update';
  existingWorkerId?: string;
}

export interface WorkerImportPreviewResult {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  rows: WorkerImportRowValidation[];
}

@Injectable()
export class WorkerImportService {
  constructor(
    @InjectRepository(WorkerImportBatchEntity)
    private readonly batchRepository: Repository<WorkerImportBatchEntity>,
    @InjectRepository(WorkerEntity)
    private readonly workerRepository: Repository<WorkerEntity>,
    private readonly countryConfigService: CountryConfigService,
    private readonly workerService: WorkerService,
    private readonly auditLogService: AuditLogService,
    @InjectQueue(QueueEnum.CoreHr)
    private readonly coreHrQueue: Queue,
  ) {}

  async preview(
    csv: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<WorkerImportPreviewResult> {
    const records = csvToRecords(csv);
    if (records.length === 0) {
      throw new BadRequestException({
        code: 'IMPORT_CSV_EMPTY',
        message: 'CSV must contain a header row and at least one data row',
      });
    }

    const rows = await this.validateRows(records, tenantId);

    return {
      totalRows: rows.length,
      validCount: rows.filter((row) => row.isValid).length,
      invalidCount: rows.filter((row) => !row.isValid).length,
      rows,
    };
  }

  async enqueueImport(
    csv: string,
    actorId: string,
    fileName: string | undefined,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<WorkerImportBatchEntity> {
    const records = csvToRecords(csv);
    if (records.length === 0) {
      throw new BadRequestException({
        code: 'IMPORT_CSV_EMPTY',
        message: 'CSV must contain a header row and at least one data row',
      });
    }

    const batch = await this.batchRepository.save(
      this.batchRepository.create({
        tenantId,
        status: WorkerImportBatchStatus.PENDING,
        fileName: fileName ?? null,
        rows: records,
        totalRows: records.length,
        createdByUserId: actorId,
      }),
    );

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'worker_import_batch.create',
      entityType: 'worker_import_batch',
      entityId: batch.id,
      changes: {
        totalRows: { old: null, new: batch.totalRows },
        fileName: { old: null, new: batch.fileName },
      },
    });

    await this.coreHrQueue.add(JobEnum.CoreHr.ImportWorkers, {
      batchId: batch.id,
      tenantId,
      actorId,
    });

    return batch;
  }

  async getBatch(
    id: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<WorkerImportBatchEntity> {
    const batch = await this.batchRepository.findOne({ where: { id, tenantId } });

    if (!batch) {
      throw new NotFoundException({
        code: 'WORKER_IMPORT_BATCH_NOT_FOUND',
        message: 'Worker import batch not found',
      });
    }

    return batch;
  }

  async listBatches(
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<WorkerImportBatchEntity[]> {
    return this.batchRepository.find({
      where: { tenantId },
      order: { createdAt: 'DESC' },
      take: 25,
    });
  }

  /** Invoked by WorkerImportProcessor (BullMQ) — creates/updates workers row by row. */
  async processBatch(batchId: string, tenantId: string, actorId: string): Promise<void> {
    const batch = await this.getBatch(batchId, tenantId);

    batch.status = WorkerImportBatchStatus.PROCESSING;
    await this.batchRepository.save(batch);

    const validations = await this.validateRows(batch.rows, tenantId);
    const results: WorkerImportRowResult[] = [];

    for (const validation of validations) {
      if (!validation.isValid) {
        results.push({
          rowNumber: validation.rowNumber,
          email: validation.data.email || null,
          outcome: WorkerImportRowOutcome.ERROR,
          error: validation.errors.join('; '),
        });
        await this.auditLogService.append({
          tenantId,
          actorId,
          action: 'worker_import_batch.row_failed',
          entityType: 'worker_import_batch',
          entityId: batch.id,
          changes: {
            rowNumber: { old: null, new: validation.rowNumber },
            email: { old: null, new: validation.data.email || null },
            error: { old: null, new: validation.errors.join('; ') },
          },
        });
        continue;
      }

      try {
        if (validation.action === 'update' && validation.existingWorkerId) {
          const dto = this.toUpdateDto(validation.data);
          const updated = await this.workerService.update(
            validation.existingWorkerId,
            dto,
            actorId,
            batch.id,
            undefined,
            tenantId,
          );
          results.push({
            rowNumber: validation.rowNumber,
            email: validation.data.email,
            outcome: WorkerImportRowOutcome.UPDATED,
            workerId: updated.id,
          });
        } else {
          const dto = this.toCreateDto(validation.data);
          const created = await this.workerService.create(
            dto,
            actorId,
            batch.id,
            undefined,
            tenantId,
          );
          results.push({
            rowNumber: validation.rowNumber,
            email: validation.data.email,
            outcome: WorkerImportRowOutcome.CREATED,
            workerId: created.id,
          });
        }
      } catch (error) {
        results.push({
          rowNumber: validation.rowNumber,
          email: validation.data.email || null,
          outcome: WorkerImportRowOutcome.ERROR,
          error: error instanceof Error ? error.message : 'Unknown import error',
        });
        await this.auditLogService.append({
          tenantId,
          actorId,
          action: 'worker_import_batch.row_failed',
          entityType: 'worker_import_batch',
          entityId: batch.id,
          changes: {
            rowNumber: { old: null, new: validation.rowNumber },
            email: { old: null, new: validation.data.email || null },
            error: {
              old: null,
              new: error instanceof Error ? error.message : 'Unknown import error',
            },
          },
        });
      }
    }

    const failureCount = results.filter(
      (result) => result.outcome === WorkerImportRowOutcome.ERROR,
    ).length;

    batch.rowResults = results;
    batch.successCount = results.length - failureCount;
    batch.failureCount = failureCount;
    batch.status =
      failureCount === 0
        ? WorkerImportBatchStatus.COMPLETED
        : WorkerImportBatchStatus.COMPLETED_WITH_ERRORS;
    batch.completedAt = new Date();

    await this.batchRepository.save(batch);

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'worker_import_batch.complete',
      entityType: 'worker_import_batch',
      entityId: batch.id,
      changes: {
        successCount: { old: null, new: batch.successCount },
        failureCount: { old: null, new: batch.failureCount },
        status: { old: null, new: batch.status },
      },
    });
  }

  private async validateRows(
    records: Record<string, string>[],
    tenantId: string,
  ): Promise<WorkerImportRowValidation[]> {
    const emailsInFile = new Map<string, number[]>();
    records.forEach((record, index) => {
      const email = (record.email ?? '').trim().toLowerCase();
      if (!email) {
        return;
      }
      const rowNumber = index + 2; // header is row 1
      emailsInFile.set(email, [...(emailsInFile.get(email) ?? []), rowNumber]);
    });

    const existingWorkers = await this.workerRepository.find({
      where: { tenantId },
      select: ['id', 'email'],
    });
    const existingByEmail = new Map(
      existingWorkers.map((worker) => [worker.email.toLowerCase(), worker.id]),
    );

    const results: WorkerImportRowValidation[] = [];

    for (let index = 0; index < records.length; index += 1) {
      const data = records[index];
      const rowNumber = index + 2;
      const errors: string[] = [];

      const email = (data.email ?? '').trim().toLowerCase();
      if (!email) {
        errors.push('email is required');
      } else if (!EMAIL_REGEX.test(email)) {
        errors.push('email is not a valid address');
      } else if ((emailsInFile.get(email) ?? []).length > 1) {
        errors.push(`email is duplicated in this file (rows ${emailsInFile.get(email)!.join(', ')})`);
      }

      if (!data.firstName?.trim()) {
        errors.push('firstName is required');
      }
      if (!data.lastName?.trim()) {
        errors.push('lastName is required');
      }
      if (!data.startDate?.trim()) {
        errors.push('startDate is required');
      } else if (!DATE_REGEX.test(data.startDate.trim())) {
        errors.push('startDate must be in YYYY-MM-DD format');
      }

      const countryCode = data.countryCode?.trim().toUpperCase();
      if (!countryCode) {
        errors.push('countryCode is required');
      } else if (!SUPPORTED_COUNTRY_CODES.includes(countryCode as never)) {
        errors.push(`countryCode ${countryCode} is not supported`);
      }

      const employmentTypeId = data.employmentTypeId?.trim();
      if (!employmentTypeId) {
        errors.push('employmentTypeId is required');
      } else if (!UUID_REGEX.test(employmentTypeId)) {
        errors.push('employmentTypeId must be a UUID');
      }

      for (const optionalUuidField of [
        'managerId',
        'divisionId',
        'departmentId',
        'legalEntityId',
      ]) {
        const value = data[optionalUuidField]?.trim();
        if (value && !UUID_REGEX.test(value)) {
          errors.push(`${optionalUuidField} must be a UUID`);
        }
      }

      let statutoryFields: Record<string, string> = {};
      if (data.statutoryFieldsJson?.trim()) {
        try {
          statutoryFields = JSON.parse(data.statutoryFieldsJson);
        } catch {
          errors.push('statutoryFieldsJson must be valid JSON');
        }
      }

      let employmentTypeCode: string | undefined;
      if (countryCode && employmentTypeId && errors.length === 0) {
        try {
          const rules = await this.countryConfigService.resolveEmploymentTypeCountryRules(
            employmentTypeId,
            countryCode,
            tenantId,
          );
          employmentTypeCode = rules.employmentType?.code;
        } catch {
          errors.push('employmentTypeId is not valid for this countryCode');
        }
      }

      if (employmentTypeCode && CONTRACTOR_TYPE_CODES.has(employmentTypeCode)) {
        errors.push(
          'contractor employment types are not supported via CSV import — create contractors individually',
        );
      }

      if (countryCode) {
        const required = STATUTORY_FIELDS_BY_COUNTRY[countryCode] ?? [];
        const missing = required.filter((field) => !statutoryFields[field]?.trim());
        if (missing.length > 0) {
          errors.push(`missing statutory fields for ${countryCode}: ${missing.join(', ')}`);
        }
      }

      const existingWorkerId = email ? existingByEmail.get(email) : undefined;

      results.push({
        rowNumber,
        data,
        errors,
        isValid: errors.length === 0,
        action: existingWorkerId ? 'update' : 'create',
        existingWorkerId,
      });
    }

    return results;
  }

  private toCreateDto(data: Record<string, string>): CreateWorkerDto {
    const statutoryFields: Record<string, string> = data.statutoryFieldsJson?.trim()
      ? JSON.parse(data.statutoryFieldsJson)
      : {};

    return {
      employmentTypeId: data.employmentTypeId.trim(),
      countryCode: data.countryCode.trim().toUpperCase(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone?.trim() || undefined,
      startDate: data.startDate.trim(),
      employeeNumber: data.employeeNumber?.trim() || undefined,
      managerId: data.managerId?.trim() || undefined,
      divisionId: data.divisionId?.trim() || undefined,
      departmentId: data.departmentId?.trim() || undefined,
      legalEntityId: data.legalEntityId?.trim() || undefined,
      statutoryFields,
    };
  }

  private toUpdateDto(data: Record<string, string>): UpdateWorkerDto {
    const dto: UpdateWorkerDto = {
      firstName: data.firstName?.trim() || undefined,
      lastName: data.lastName?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      employeeNumber: data.employeeNumber?.trim() || undefined,
      managerId: data.managerId?.trim() || undefined,
      divisionId: data.divisionId?.trim() || undefined,
      departmentId: data.departmentId?.trim() || undefined,
      legalEntityId: data.legalEntityId?.trim() || undefined,
    };

    if (data.statutoryFieldsJson?.trim()) {
      dto.statutoryFields = JSON.parse(data.statutoryFieldsJson);
      dto.countryCode = data.countryCode?.trim().toUpperCase() || undefined;
    }

    return dto;
  }
}
