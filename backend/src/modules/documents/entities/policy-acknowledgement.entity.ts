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
} from 'typeorm';
import { PolicyVersionEntity } from './policy-version.entity';

@Entity('policy_acknowledgements')
@Index(
  'IDX_policy_acknowledgements_worker_version',
  ['tenantId', 'workerId', 'policyVersionId'],
  { unique: true },
)
@Index('IDX_policy_acknowledgements_version', ['tenantId', 'policyVersionId'])
export class PolicyAcknowledgementEntity {
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

  @Column({ type: 'uuid' })
  policyVersionId: string;

  @ManyToOne(() => PolicyVersionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'policyVersionId' })
  policyVersion?: PolicyVersionEntity;

  @Column({ type: 'timestamptz' })
  acknowledgedAt: Date;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
