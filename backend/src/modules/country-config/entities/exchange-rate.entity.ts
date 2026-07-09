import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  FetchStatus,
  RateSource,
  RateStatus,
  RateType,
} from '../enums/country-config.enum';
import { CurrencyCodeEntity } from './currency-code.entity';

@Entity('exchange_rate_fetch_batches')
export class ExchangeRateFetchBatchEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @CreateDateColumn({ type: 'timestamptz' })
  fetchedAt: Date;

  @Column({ type: 'varchar', length: 50, default: 'frankfurter' })
  source: string;

  @Column({ type: 'enum', enum: FetchStatus, enumName: 'fetch_status_enum' })
  status: FetchStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;
}

@Entity('exchange_rates')
@Index('IDX_exchange_rates_lookup', [
  'tenantId',
  'fromCurrency',
  'toCurrency',
  'effectiveFrom',
])
@Index(
  'IDX_exchange_rates_unique_pair',
  ['tenantId', 'fromCurrency', 'toCurrency', 'rateType', 'effectiveFrom'],
  { unique: true },
)
export class ExchangeRateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 3 })
  fromCurrency: string;

  @ManyToOne(() => CurrencyCodeEntity)
  @JoinColumn({ name: 'fromCurrency', referencedColumnName: 'code' })
  fromCurrencyRef?: CurrencyCodeEntity;

  @Column({ type: 'char', length: 3 })
  toCurrency: string;

  @ManyToOne(() => CurrencyCodeEntity)
  @JoinColumn({ name: 'toCurrency', referencedColumnName: 'code' })
  toCurrencyRef?: CurrencyCodeEntity;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  rate: string;

  @Column({
    type: 'enum',
    enum: RateType,
    enumName: 'rate_type_enum',
    default: RateType.SPOT,
  })
  rateType: RateType;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({
    type: 'enum',
    enum: RateSource,
    enumName: 'rate_source_enum',
    default: RateSource.FRANKFURTER,
  })
  source: RateSource;

  @Column({
    type: 'enum',
    enum: RateStatus,
    enumName: 'rate_status_enum',
    default: RateStatus.ACTIVE,
  })
  status: RateStatus;

  @Column({ type: 'uuid', nullable: true })
  apiFetchBatchId: string | null;

  @ManyToOne(() => ExchangeRateFetchBatchEntity, { nullable: true })
  @JoinColumn({ name: 'apiFetchBatchId' })
  apiFetchBatch?: ExchangeRateFetchBatchEntity;

  @Column({ type: 'uuid', nullable: true })
  approvedBy: string | null;
}
