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
import { CandidateStatus } from '../enums/recruitment.enum';
import { JobRequisitionEntity } from './job-requisition.entity';

@Entity('candidates')
@Index('IDX_candidates_tenant_requisition', ['tenantId', 'requisitionId'])
@Index('IDX_candidates_tenant_status', ['tenantId', 'status'])
@Index('IDX_candidates_tenant_email', ['tenantId', 'email'])
export class CandidateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  requisitionId: string;

  @ManyToOne(() => JobRequisitionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requisitionId' })
  requisition?: JobRequisitionEntity;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  cvBlobUrl: string | null;

  @Column({
    type: 'enum',
    enum: CandidateStatus,
    enumName: 'candidate_status_enum',
    default: CandidateStatus.APPLIED,
  })
  status: CandidateStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'text', nullable: true })
  rejectedReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  consentAt: Date | null;

  @Column({ type: 'inet', nullable: true })
  consentIp: string | null;

  @Column({ type: 'uuid', nullable: true })
  hiredWorkerId: string | null;

  @ManyToOne(() => WorkerEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hiredWorkerId' })
  hiredWorker?: WorkerEntity | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
