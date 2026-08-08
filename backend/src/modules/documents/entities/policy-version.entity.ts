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
import { PolicyVersionStatus } from '../enums/policy.enum';
import { PolicyEntity } from './policy.entity';

@Entity('policy_versions')
@Index(
  'IDX_policy_versions_tenant_policy_version',
  ['tenantId', 'policyId', 'version'],
  {
    unique: true,
  },
)
@Index('IDX_policy_versions_status', ['tenantId', 'policyId', 'status'])
export class PolicyVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  policyId: string;

  @ManyToOne(() => PolicyEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policyId' })
  policy?: PolicyEntity;

  @Column({ type: 'int' })
  version: number;

  @Column({ type: 'text', nullable: true })
  contentHtml: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  blobUrl: string | null;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({
    type: 'enum',
    enum: PolicyVersionStatus,
    enumName: 'policy_version_status_enum',
    default: PolicyVersionStatus.DRAFT,
  })
  status: PolicyVersionStatus;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  publishedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
