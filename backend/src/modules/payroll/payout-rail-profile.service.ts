import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateCsvExportProfileDto,
  UpdateCsvExportProfileDto,
  UpdatePayoutRailProfileDto,
  UpsertCorridorOverrideDto,
} from './dto/payout-rail.dto';
import { CsvExportProfileEntity } from './entities/csv-export-profile.entity';
import { PayoutCorridorOverrideEntity } from './entities/payout-corridor-override.entity';
import { PayoutRailProfileEntity } from './entities/payout-rail-profile.entity';
import { DEFAULT_CSV_COLUMNS } from './manual-csv.exporter';

type ActorContext = {
  userId: string;
  tenantId: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class PayoutRailProfileService {
  constructor(
    @InjectRepository(PayoutRailProfileEntity)
    private readonly profileRepository: Repository<PayoutRailProfileEntity>,
    @InjectRepository(PayoutCorridorOverrideEntity)
    private readonly corridorRepository: Repository<PayoutCorridorOverrideEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async getProfile(
    legalEntityId: string,
    actor: ActorContext,
  ): Promise<PayoutRailProfileEntity | null> {
    await this.assertFinance(actor);
    return this.profileRepository.findOne({
      where: { tenantId: actor.tenantId, legalEntityId },
    });
  }

  async updateProfile(
    legalEntityId: string,
    dto: UpdatePayoutRailProfileDto,
    actor: ActorContext,
  ): Promise<PayoutRailProfileEntity> {
    await this.assertFinance(actor);
    let profile = await this.profileRepository.findOne({
      where: { tenantId: actor.tenantId, legalEntityId },
    });
    if (!profile) {
      profile = this.profileRepository.create({
        tenantId: actor.tenantId,
        legalEntityId,
        ...dto,
        secondaryRail: dto.secondaryRail ?? null,
      });
    } else {
      profile.primaryRail = dto.primaryRail;
      profile.secondaryRail = dto.secondaryRail ?? null;
      profile.fallbackRail = dto.fallbackRail;
    }
    const saved = await this.profileRepository.save(profile);
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: 'payout_rail_profile.update',
      entityType: 'payout_rail_profile',
      entityId: saved.id,
      changes: {
        primaryRail: { old: null, new: saved.primaryRail },
        secondaryRail: { old: null, new: saved.secondaryRail },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return saved;
  }

  async listCorridors(
    actor: ActorContext,
  ): Promise<PayoutCorridorOverrideEntity[]> {
    await this.assertFinance(actor);
    return this.corridorRepository.find({
      where: { tenantId: actor.tenantId },
      order: { payerCountryCode: 'ASC', recipientBankCountryCode: 'ASC' },
    });
  }

  async upsertCorridor(
    dto: UpsertCorridorOverrideDto,
    actor: ActorContext,
  ): Promise<PayoutCorridorOverrideEntity> {
    await this.assertFinance(actor);
    const payer = dto.payerCountryCode.toUpperCase();
    const recipient = dto.recipientBankCountryCode.toUpperCase();
    let row = await this.corridorRepository.findOne({
      where: {
        tenantId: actor.tenantId,
        payerCountryCode: payer,
        recipientBankCountryCode: recipient,
      },
    });
    if (!row) {
      row = this.corridorRepository.create({
        tenantId: actor.tenantId,
        payerCountryCode: payer,
        recipientBankCountryCode: recipient,
        primaryRail: dto.primaryRail,
        secondaryRail: dto.secondaryRail ?? null,
        fallbackRail: dto.fallbackRail,
      });
    } else {
      row.primaryRail = dto.primaryRail;
      row.secondaryRail = dto.secondaryRail ?? null;
      row.fallbackRail = dto.fallbackRail;
    }
    const saved = await this.corridorRepository.save(row);
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: 'payout_corridor_override.upsert',
      entityType: 'payout_corridor_override',
      entityId: saved.id,
      changes: {
        payerCountryCode: { old: null, new: saved.payerCountryCode },
        recipientBankCountryCode: {
          old: null,
          new: saved.recipientBankCountryCode,
        },
        primaryRail: { old: null, new: saved.primaryRail },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return saved;
  }

  private async assertFinance(actor: ActorContext): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actor.userId);
    const allowed = auth.roleCodes.some((c) =>
      [
        PolarisRoleCode.FINANCE,
        PolarisRoleCode.SUPER_ADMIN,
        PolarisRoleCode.PEOPLE_OPS,
      ].includes(c as PolarisRoleCode),
    );
    if (!allowed) {
      throw new ForbiddenException('Finance access required');
    }
  }
}

@Injectable()
export class CsvExportProfileService {
  constructor(
    @InjectRepository(CsvExportProfileEntity)
    private readonly profileRepository: Repository<CsvExportProfileEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async create(
    dto: CreateCsvExportProfileDto,
    actor: ActorContext,
  ): Promise<CsvExportProfileEntity> {
    await this.assertFinance(actor);
    const saved = await this.profileRepository.save(
      this.profileRepository.create({
        tenantId: actor.tenantId,
        legalEntityId: dto.legalEntityId,
        name: dto.name,
        columns: dto.columns.length ? dto.columns : DEFAULT_CSV_COLUMNS,
        includePayerFromFundingAccount:
          dto.includePayerFromFundingAccount ?? true,
        isDefault: dto.isDefault ?? false,
      }),
    );
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: 'csv_export_profile.create',
      entityType: 'csv_export_profile',
      entityId: saved.id,
      changes: { name: { old: null, new: saved.name } },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return saved;
  }

  async update(
    id: string,
    dto: UpdateCsvExportProfileDto,
    actor: ActorContext,
  ): Promise<CsvExportProfileEntity> {
    await this.assertFinance(actor);
    const existing = await this.profileRepository.findOne({
      where: { id, tenantId: actor.tenantId },
    });
    if (!existing) {
      throw new NotFoundException('CSV export profile not found');
    }
    if (dto.name !== undefined) existing.name = dto.name;
    if (dto.columns !== undefined) existing.columns = dto.columns;
    if (dto.includePayerFromFundingAccount !== undefined) {
      existing.includePayerFromFundingAccount =
        dto.includePayerFromFundingAccount;
    }
    if (dto.isDefault !== undefined) existing.isDefault = dto.isDefault;
    return this.profileRepository.save(existing);
  }

  async list(
    legalEntityId: string | undefined,
    actor: ActorContext,
  ): Promise<CsvExportProfileEntity[]> {
    await this.assertFinance(actor);
    return this.profileRepository.find({
      where: {
        tenantId: actor.tenantId,
        ...(legalEntityId ? { legalEntityId } : {}),
      },
      order: { name: 'ASC' },
    });
  }

  private async assertFinance(actor: ActorContext): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actor.userId);
    const allowed = auth.roleCodes.some((c) =>
      [PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN].includes(
        c as PolarisRoleCode,
      ),
    );
    if (!allowed) {
      throw new ForbiddenException('Finance role required');
    }
  }
}
