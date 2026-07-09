import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';

export type AuditLogChanges = Record<
  string,
  { old: unknown; new: unknown }
>;

@Entity('audit_log')
@Index('IDX_audit_log_tenant_entity', ['tenantId', 'entityType', 'entityId'])
@Index('IDX_audit_log_tenant_created', ['tenantId', 'createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'uuid' })
  actorId: string;

  @Column({ type: 'jsonb', default: {} })
  changes: AuditLogChanges;

  @Column({ type: 'uuid', nullable: true })
  correlationId: string | null;

  @Column({ type: 'inet', nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
