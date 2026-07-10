import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
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
import { PayslipStatus } from '../enums/payroll.enum';
import { PayRunLineItemEntity } from './pay-run-line-item.entity';

@Entity('payslips')
@Index('IDX_payslips_tenant_worker', ['tenantId', 'workerId'])
@Index('UQ_payslips_pay_run_line_item', ['tenantId', 'payRunLineItemId'], {
  unique: true,
})
export class PayslipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  legalEntityId: string;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity;

  @Column({ type: 'uuid' })
  payRunLineItemId: string;

  @ManyToOne(() => PayRunLineItemEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payRunLineItemId' })
  payRunLineItem?: PayRunLineItemEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  netPay: string;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfBlobUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  releasedAt: Date | null;

  @Column({
    type: 'enum',
    enum: PayslipStatus,
    enumName: 'payslip_status_enum',
    default: PayslipStatus.DRAFT,
  })
  status: PayslipStatus;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
