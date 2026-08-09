import { AuditLogService } from '@/modules/compliance/audit-log.service';
import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateDepartmentDto,
  CreateDivisionDto,
  CreateLegalEntityDto,
  CreateOfficeLocationDto,
  UpdateDepartmentDto,
  UpdateDivisionDto,
  UpdateLegalEntityDto,
  UpdateOfficeLocationDto,
} from './dto/org-admin.dto';
import { DepartmentEntity } from './entities/department.entity';
import { DivisionEntity } from './entities/division.entity';
import { LegalEntityEntity } from './entities/legal-entity.entity';
import { OfficeLocationEntity } from './entities/office-location.entity';
import { EntityStatus } from './enums/org.enum';

@Injectable()
export class OrgAdminService {
  constructor(
    @InjectRepository(DivisionEntity)
    private readonly divisionRepository: Repository<DivisionEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentRepository: Repository<DepartmentEntity>,
    @InjectRepository(LegalEntityEntity)
    private readonly legalEntityRepository: Repository<LegalEntityEntity>,
    @InjectRepository(OfficeLocationEntity)
    private readonly officeLocationRepository: Repository<OfficeLocationEntity>,
    private readonly auditLogService: AuditLogService,
  ) {}

  listDivisions(tenantId: string): Promise<DivisionEntity[]> {
    return this.divisionRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async getDivision(id: string, tenantId: string): Promise<DivisionEntity> {
    const row = await this.divisionRepository.findOne({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException({
        code: 'DIVISION_NOT_FOUND',
        message: 'Division not found',
      });
    }
    return row;
  }

  async createDivision(
    dto: CreateDivisionDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<DivisionEntity> {
    const row = await this.divisionRepository.save(
      this.divisionRepository.create({
        tenantId,
        name: dto.name,
        headWorkerId: dto.headWorkerId ?? null,
      }),
    );
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'division.create',
      entityType: 'division',
      entityId: row.id,
      changes: { name: { old: null, new: row.name } },
      correlationId,
      ipAddress,
    });
    return row;
  }

  async updateDivision(
    id: string,
    dto: UpdateDivisionDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<DivisionEntity> {
    const row = await this.getDivision(id, tenantId);
    const before = { name: row.name, headWorkerId: row.headWorkerId };
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.headWorkerId !== undefined) row.headWorkerId = dto.headWorkerId;
    const saved = await this.divisionRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'division.update',
      entityType: 'division',
      entityId: saved.id,
      changes: {
        name: { old: before.name, new: saved.name },
        headWorkerId: { old: before.headWorkerId, new: saved.headWorkerId },
      },
      correlationId,
      ipAddress,
    });
    return saved;
  }

  listDepartments(tenantId: string): Promise<DepartmentEntity[]> {
    return this.departmentRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async getDepartment(id: string, tenantId: string): Promise<DepartmentEntity> {
    const row = await this.departmentRepository.findOne({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'DEPARTMENT_NOT_FOUND',
        message: 'Department not found',
      });
    }
    return row;
  }

  async createDepartment(
    dto: CreateDepartmentDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<DepartmentEntity> {
    const row = await this.departmentRepository.save(
      this.departmentRepository.create({
        tenantId,
        name: dto.name,
        divisionId: dto.divisionId ?? null,
        parentDepartmentId: dto.parentDepartmentId ?? null,
      }),
    );
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'department.create',
      entityType: 'department',
      entityId: row.id,
      changes: { name: { old: null, new: row.name } },
      correlationId,
      ipAddress,
    });
    return row;
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<DepartmentEntity> {
    const row = await this.getDepartment(id, tenantId);
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.divisionId !== undefined) row.divisionId = dto.divisionId;
    if (dto.parentDepartmentId !== undefined) {
      row.parentDepartmentId = dto.parentDepartmentId;
    }
    const saved = await this.departmentRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'department.update',
      entityType: 'department',
      entityId: saved.id,
      changes: { name: { old: null, new: saved.name } },
      correlationId,
      ipAddress,
    });
    return saved;
  }

  listLegalEntities(tenantId: string): Promise<LegalEntityEntity[]> {
    return this.legalEntityRepository.find({
      where: { tenantId },
      order: { code: 'ASC' },
    });
  }

  async getLegalEntity(id: string, tenantId: string): Promise<LegalEntityEntity> {
    const row = await this.legalEntityRepository.findOne({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'LEGAL_ENTITY_NOT_FOUND',
        message: 'Legal entity not found',
      });
    }
    return row;
  }

  async createLegalEntity(
    dto: CreateLegalEntityDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<LegalEntityEntity> {
    const row = await this.legalEntityRepository.save(
      this.legalEntityRepository.create({
        tenantId,
        code: dto.code,
        registeredName: dto.registeredName,
        tradingName: dto.tradingName ?? null,
        countryCode: dto.countryCode.toUpperCase(),
        functionalCurrency: dto.functionalCurrency.toUpperCase(),
        effectiveFrom: dto.effectiveFrom,
        status: dto.status ?? EntityStatus.ACTIVE,
        createdBy: actorId,
      }),
    );
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'legal_entity.create',
      entityType: 'legal_entity',
      entityId: row.id,
      changes: { code: { old: null, new: row.code } },
      correlationId,
      ipAddress,
    });
    return row;
  }

  async updateLegalEntity(
    id: string,
    dto: UpdateLegalEntityDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<LegalEntityEntity> {
    const row = await this.getLegalEntity(id, tenantId);
    if (dto.code !== undefined) row.code = dto.code;
    if (dto.registeredName !== undefined) row.registeredName = dto.registeredName;
    if (dto.tradingName !== undefined) row.tradingName = dto.tradingName;
    if (dto.countryCode !== undefined) {
      row.countryCode = dto.countryCode.toUpperCase();
    }
    if (dto.functionalCurrency !== undefined) {
      row.functionalCurrency = dto.functionalCurrency.toUpperCase();
    }
    if (dto.effectiveFrom !== undefined) row.effectiveFrom = dto.effectiveFrom;
    if (dto.status !== undefined) row.status = dto.status;
    const saved = await this.legalEntityRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'legal_entity.update',
      entityType: 'legal_entity',
      entityId: saved.id,
      changes: { code: { old: null, new: saved.code } },
      correlationId,
      ipAddress,
    });
    return saved;
  }

  listOfficeLocations(tenantId: string): Promise<OfficeLocationEntity[]> {
    return this.officeLocationRepository.find({
      where: { tenantId },
      order: { name: 'ASC' },
    });
  }

  async getOfficeLocation(
    id: string,
    tenantId: string,
  ): Promise<OfficeLocationEntity> {
    const row = await this.officeLocationRepository.findOne({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        code: 'OFFICE_LOCATION_NOT_FOUND',
        message: 'Office location not found',
      });
    }
    return row;
  }

  async createOfficeLocation(
    dto: CreateOfficeLocationDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<OfficeLocationEntity> {
    const row = await this.officeLocationRepository.save(
      this.officeLocationRepository.create({
        tenantId,
        name: dto.name,
        countryCode: dto.countryCode.toUpperCase(),
        address: dto.address ?? null,
        latitude: dto.latitude,
        longitude: dto.longitude,
        geofenceRadiusM: dto.geofenceRadiusM ?? 200,
      }),
    );
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'office_location.create',
      entityType: 'office_location',
      entityId: row.id,
      changes: { name: { old: null, new: row.name } },
      correlationId,
      ipAddress,
    });
    return row;
  }

  async updateOfficeLocation(
    id: string,
    dto: UpdateOfficeLocationDto,
    actorId: string,
    tenantId: string,
    correlationId?: string,
    ipAddress?: string,
  ): Promise<OfficeLocationEntity> {
    const row = await this.getOfficeLocation(id, tenantId);
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.countryCode !== undefined) {
      row.countryCode = dto.countryCode.toUpperCase();
    }
    if (dto.address !== undefined) row.address = dto.address;
    if (dto.latitude !== undefined) row.latitude = dto.latitude;
    if (dto.longitude !== undefined) row.longitude = dto.longitude;
    if (dto.geofenceRadiusM !== undefined) {
      row.geofenceRadiusM = dto.geofenceRadiusM;
    }
    const saved = await this.officeLocationRepository.save(row);
    await this.auditLogService.append({
      tenantId,
      actorId,
      action: 'office_location.update',
      entityType: 'office_location',
      entityId: saved.id,
      changes: { name: { old: null, new: saved.name } },
      correlationId,
      ipAddress,
    });
    return saved;
  }
}
