import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuditLogService } from './audit-log.service';
import { DIGITARO_TENANT_ID } from './constants/tenant.constants';
import { ExportDsarDto } from './dto/dsar.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

interface DsarWorkerProfileRow {
  id: string;
  employeeNumber: string | null;
  firstName: string;
  lastName: string;
  email: string;
  personalEmail: string | null;
  phone: string | null;
  countryCode: string;
  status: string;
  startDate: string;
  endDate: string | null;
  statutoryFields: Record<string, string>;
}

interface DsarDocumentRow {
  id: string;
  status: string;
  documentNumber: string | null;
  blobUrl: string | null;
  issuedAt: Date | null;
  createdAt: Date;
}

interface DsarPayslipRow {
  id: string;
  periodStart: string;
  periodEnd: string;
  netPay: string;
  currencyCode: string;
  status: string;
  pdfBlobUrl: string | null;
}

export interface DsarExportPackage {
  workerId: string;
  generatedAt: string;
  profile: DsarWorkerProfileRow;
  documents: DsarDocumentRow[];
  payslips: DsarPayslipRow[];
  auditTrail: {
    action: string;
    entityType: string;
    createdAt: Date;
    changes: unknown;
  }[];
}

/**
 * FLW-SEC-004 step 3 — builds the DSAR "access" export package (profile,
 * documents, audit trail, payslips) referenced in
 * deferred-compliance-work.md §2 step 4. Reads across module boundaries via
 * raw SQL (DataSource) rather than importing core-hr/documents/payroll
 * modules, which would create a circular dependency back into
 * ComplianceModule.
 */
@Injectable()
export class DsarExportService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly dataSource: DataSource,
  ) {}

  async exportForWorker(
    dto: ExportDsarDto,
    actorId: string,
    tenantId: string = DIGITARO_TENANT_ID,
  ): Promise<DsarExportPackage> {
    const profileRows = await this.dataSource.query<
      Omit<DsarWorkerProfileRow, 'statutoryFields'>[]
    >(
      `SELECT id, "employeeNumber", "firstName", "lastName", email,
              "personalEmail", phone, "countryCode", status,
              "startDate", "endDate"
       FROM workers
       WHERE "tenantId" = $1 AND id = $2`,
      [tenantId, dto.workerId],
    );
    const profileBase = profileRows[0];
    if (!profileBase) {
      throw new NotFoundException('Worker not found for DSAR export');
    }

    const statutoryRows = await this.dataSource.query<
      { fieldKey: string; fieldValue: string }[]
    >(
      `SELECT "fieldKey", "fieldValue"
       FROM worker_statutory_ids
       WHERE "tenantId" = $1 AND "workerId" = $2`,
      [tenantId, dto.workerId],
    );
    const statutoryFields: Record<string, string> = {};
    for (const row of statutoryRows) {
      statutoryFields[row.fieldKey] = row.fieldValue;
    }
    const profile: DsarWorkerProfileRow = {
      ...profileBase,
      statutoryFields,
    };

    const documents = await this.dataSource.query<DsarDocumentRow[]>(
      `SELECT id, status, "documentNumber", "blobUrl", "issuedAt", "createdAt"
       FROM generated_documents
       WHERE "tenantId" = $1 AND "workerId" = $2
       ORDER BY "createdAt" DESC`,
      [tenantId, dto.workerId],
    );

    const payslips = await this.dataSource.query<DsarPayslipRow[]>(
      `SELECT id, "periodStart", "periodEnd", "netPay", "currencyCode", status, "pdfBlobUrl"
       FROM payslips
       WHERE "tenantId" = $1 AND "workerId" = $2
       ORDER BY "periodStart" DESC`,
      [tenantId, dto.workerId],
    );

    const auditEntries = await this.auditLogRepository
      .createQueryBuilder('auditLog')
      .where('auditLog.tenantId = :tenantId', { tenantId })
      .andWhere('auditLog.entityId = :workerId', { workerId: dto.workerId })
      .orderBy('auditLog.createdAt', 'DESC')
      .getMany();

    const exportPackage: DsarExportPackage = {
      workerId: dto.workerId,
      generatedAt: new Date().toISOString(),
      profile,
      documents,
      payslips,
      auditTrail: auditEntries.map((entry) => ({
        action: entry.action,
        entityType: entry.entityType,
        createdAt: entry.createdAt,
        changes: entry.changes,
      })),
    };

    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'dsar.export',
      entityType: 'worker',
      entityId: dto.workerId,
      changes: {
        reason: { old: null, new: dto.reason ?? null },
        documentCount: { old: null, new: documents.length },
        payslipCount: { old: null, new: payslips.length },
      },
    });

    return exportPackage;
  }
}
