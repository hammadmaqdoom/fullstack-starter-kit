import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { CurrencyCodeEntity } from '@/modules/country-config/entities/currency-code.entity';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BillingModel } from '../enums/worker.enum';
import { WorkerEntity } from './worker.entity';

@Entity('contractor_profiles')
@Index('IDX_contractor_profiles_tenant_worker', ['tenantId', 'workerId'], {
  unique: true,
})
export class ContractorProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @OneToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({
    type: 'enum',
    enum: BillingModel,
    enumName: 'billing_model_enum',
  })
  billingModel: BillingModel;

  @Column({ type: 'date', nullable: true })
  contractStart: string | null;

  @Column({ type: 'date', nullable: true })
  contractEnd: string | null;

  @Column({ type: 'int', nullable: true })
  paymentTermsDays: number | null;

  @Column({ type: 'char', length: 3, nullable: true })
  paymentCurrency: string | null;

  @ManyToOne(() => CurrencyCodeEntity, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'paymentCurrency' })
  paymentCurrencyRef?: CurrencyCodeEntity | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  agencyName: string | null;
}
