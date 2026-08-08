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
import { CompOffCreditStatus } from '../enums/comp-off.enum';

@Entity('comp_off_credits')
@Index('IDX_comp_off_credits_worker_status', ['tenantId', 'workerId', 'status'])
export class CompOffCreditEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  creditedDays: string;

  @Column({ type: 'date' })
  earnedDate: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sourceReference: string | null;

  @Column({
    type: 'enum',
    enum: CompOffCreditStatus,
    enumName: 'comp_off_credit_status_enum',
    default: CompOffCreditStatus.ACTIVE,
  })
  status: CompOffCreditStatus;

  @Column({ type: 'uuid' })
  grantedByWorkerId: string;

  @Column({ type: 'uuid', nullable: true })
  usedInLeaveRequestId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
