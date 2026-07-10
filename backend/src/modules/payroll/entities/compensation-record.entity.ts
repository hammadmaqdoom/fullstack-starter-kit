import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
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
import { PayFrequency } from '../enums/payroll.enum';
import { PayComponentEntity } from './pay-component.entity';

@Entity('compensation_records')
@Index('IDX_compensation_records_tenant_worker', ['tenantId', 'workerId'])
export class CompensationRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'uuid' })
  payComponentId: string;

  @ManyToOne(() => PayComponentEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payComponentId' })
  payComponent?: PayComponentEntity;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @Column({
    type: 'enum',
    enum: PayFrequency,
    enumName: 'pay_frequency_enum',
  })
  payFrequency: PayFrequency;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
