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
import { EntraProvisioningJobStatus } from '../enums/onboarding.enum';

@Entity('entra_provisioning_jobs')
@Index('IDX_entra_provisioning_jobs_status', [
  'tenantId',
  'status',
  'scheduledFor',
])
export class EntraProvisioningJobEntity {
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

  @Column({ type: 'timestamptz' })
  scheduledFor: Date;

  @Column({
    type: 'enum',
    enum: EntraProvisioningJobStatus,
    enumName: 'entra_provisioning_job_status_enum',
    default: EntraProvisioningJobStatus.SCHEDULED,
  })
  status: EntraProvisioningJobStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  workEmail: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entraObjectId: string | null;

  @Column({ type: 'uuid', nullable: true })
  graphCorrelationId: string | null;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
