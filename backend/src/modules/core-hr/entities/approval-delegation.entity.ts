import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import { DelegationScope } from '../enums/delegation.enum';
import { WorkerEntity } from './worker.entity';

@Entity('approval_delegations')
@Index('IDX_approval_delegations_delegator', ['tenantId', 'delegatorWorkerId'])
@Index('IDX_approval_delegations_delegate', ['tenantId', 'delegateWorkerId'])
export class ApprovalDelegationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  delegatorWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delegatorWorkerId' })
  delegatorWorker?: WorkerEntity;

  @Column({ type: 'uuid' })
  delegateWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delegateWorkerId' })
  delegateWorker?: WorkerEntity;

  @Column({
    type: 'enum',
    enum: DelegationScope,
    enumName: 'delegation_scope_enum',
    default: DelegationScope.APPROVALS,
  })
  scope: DelegationScope;

  @Column({ type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ type: 'timestamptz' })
  effectiveTo: Date;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
