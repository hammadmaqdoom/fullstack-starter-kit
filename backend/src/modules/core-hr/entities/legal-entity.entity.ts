import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { CurrencyCodeEntity } from '@/modules/country-config/entities/currency-code.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EntityStatus } from '../enums/org.enum';

@Entity('legal_entities')
@Index('IDX_legal_entities_tenant_code', ['tenantId', 'code'], { unique: true })
@Index('IDX_legal_entities_scope', ['tenantId', 'countryCode', 'status'])
export class LegalEntityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  registeredName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  tradingName: string | null;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'char', length: 3 })
  functionalCurrency: string;

  @ManyToOne(() => CurrencyCodeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'functionalCurrency' })
  functionalCurrencyRef?: CurrencyCodeEntity;

  @Column({
    type: 'enum',
    enum: EntityStatus,
    enumName: 'entity_status_enum',
    default: EntityStatus.ACTIVE,
  })
  status: EntityStatus;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;
}
