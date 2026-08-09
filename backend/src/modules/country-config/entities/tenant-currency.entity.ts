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

@Entity('tenant_currencies')
@Index('IDX_tenant_currencies_unique', ['tenantId', 'currencyCode'], {
  unique: true,
})
export class TenantCurrencyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @ManyToOne(() => CurrencyCodeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'currencyCode', referencedColumnName: 'code' })
  currency?: CurrencyCodeEntity;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isReportingCurrency: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
