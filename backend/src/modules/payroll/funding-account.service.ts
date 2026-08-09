import { AuditLogService } from '@/modules/compliance/audit-log.service';
import { DIGITARO_TENANT_ID } from '@/modules/compliance/constants/tenant.constants';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { RbacService } from '@/modules/compliance/rbac.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  CreateFundingAccountDto,
  QueryFundingAccountsDto,
  UpdateFundingAccountDto,
} from './dto/funding-account.dto';
import {
  FundingAccountBankDetails,
  FundingAccountEntity,
} from './entities/funding-account.entity';
import { FundingAccountProvider } from './enums/payout.enum';

type ActorContext = {
  userId: string;
  tenantId: string;
  correlationId?: string;
  ipAddress?: string;
};

@Injectable()
export class FundingAccountService {
  constructor(
    @InjectRepository(FundingAccountEntity)
    private readonly fundingRepository: Repository<FundingAccountEntity>,
    private readonly auditLogService: AuditLogService,
    private readonly rbacService: RbacService,
  ) {}

  async create(
    dto: CreateFundingAccountDto,
    actor: ActorContext,
  ): Promise<FundingAccountEntity> {
    await this.assertFinance(actor);
    const entity = this.fundingRepository.create({
      tenantId: actor.tenantId,
      legalEntityId: dto.legalEntityId,
      provider: dto.provider,
      currency: dto.currency.toUpperCase(),
      label: dto.label,
      externalAccountId: dto.externalAccountId ?? null,
      bankDetails:
        dto.provider === FundingAccountProvider.MANUAL_BANK
          ? ((dto.bankDetails as FundingAccountBankDetails) ?? null)
          : null,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.fundingRepository.save(entity);
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: 'funding_account.create',
      entityType: 'funding_account',
      entityId: saved.id,
      changes: {
        provider: { old: null, new: saved.provider },
        legalEntityId: { old: null, new: saved.legalEntityId },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return saved;
  }

  async update(
    id: string,
    dto: UpdateFundingAccountDto,
    actor: ActorContext,
  ): Promise<FundingAccountEntity> {
    await this.assertFinance(actor);
    const existing = await this.requireOne(actor.tenantId, id);
    if (dto.label !== undefined) existing.label = dto.label;
    if (dto.externalAccountId !== undefined) {
      existing.externalAccountId = dto.externalAccountId;
    }
    if (dto.bankDetails !== undefined) {
      existing.bankDetails = dto.bankDetails as FundingAccountBankDetails | null;
    }
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;
    const saved = await this.fundingRepository.save(existing);
    await this.auditLogService.append({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      action: 'funding_account.update',
      entityType: 'funding_account',
      entityId: saved.id,
      changes: {
        label: { old: null, new: saved.label },
        isActive: { old: null, new: saved.isActive },
      },
      correlationId: actor.correlationId,
      ipAddress: actor.ipAddress,
    });
    return saved;
  }

  async list(
    query: QueryFundingAccountsDto,
    actor: ActorContext,
  ): Promise<ReturnType<FundingAccountService['toPublicDto']>[]> {
    const auth = await this.rbacService.getAuthContext(actor.userId);
    const rows = await this.fundingRepository.find({
      where: {
        tenantId: actor.tenantId,
        deletedAt: IsNull(),
        ...(query.legalEntityId
          ? { legalEntityId: query.legalEntityId }
          : {}),
        ...(query.provider ? { provider: query.provider } : {}),
      },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => this.toPublicDto(row, auth.roleCodes));
  }

  async get(
    id: string,
    actor: ActorContext,
  ): Promise<ReturnType<FundingAccountService['toPublicDto']>> {
    const auth = await this.rbacService.getAuthContext(actor.userId);
    const row = await this.requireOne(actor.tenantId, id);
    return this.toPublicDto(row, auth.roleCodes);
  }

  toPublicDto(row: FundingAccountEntity, roleCodes: string[]) {
    const canSeeBank = roleCodes.some((c) =>
      [PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN].includes(
        c as PolarisRoleCode,
      ),
    );
    return {
      id: row.id,
      legalEntityId: row.legalEntityId,
      provider: row.provider,
      currency: row.currency,
      label: row.label,
      externalAccountId: row.externalAccountId,
      bankDetails: canSeeBank ? row.bankDetails : null,
      bankDetailsRedacted: !canSeeBank && row.bankDetails != null,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async requireOne(
    tenantId: string,
    id: string,
  ): Promise<FundingAccountEntity> {
    const row = await this.fundingRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!row) {
      throw new NotFoundException('Funding account not found');
    }
    return row;
  }

  private async assertFinance(actor: ActorContext): Promise<void> {
    const auth = await this.rbacService.getAuthContext(actor.userId);
    const allowed = auth.roleCodes.some((c) =>
      [PolarisRoleCode.FINANCE, PolarisRoleCode.SUPER_ADMIN].includes(
        c as PolarisRoleCode,
      ),
    );
    if (!allowed || auth.tenantId !== (actor.tenantId || DIGITARO_TENANT_ID)) {
      throw new ForbiddenException('Finance role required');
    }
  }
}
