import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { CurrencyCodeEntity } from './currency-code.entity';

@Entity('country_currency_configs')
@Index('IDX_country_currency_tenant_country', ['tenantId', 'countryCode'], {
  unique: true,
})
export class CountryCurrencyConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'char', length: 3 })
  defaultCurrency: string;

  @ManyToOne(() => CurrencyCodeEntity)
  @JoinColumn({ name: 'defaultCurrency', referencedColumnName: 'code' })
  defaultCurrencyRef?: CurrencyCodeEntity;

  @Column({ type: 'char', array: true })
  allowedCurrencies: string[];
}
