import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EsignEnvelopeEntity } from './esign-envelope.entity';

/**
 * Append-only e-sign audit trail (FLW-DOC-003).
 * No updatedAt / soft-delete — never UPDATE or DELETE rows.
 */
@Entity('esign_audit_events')
@Index('IDX_esign_audit_events_envelope_created', [
  'tenantId',
  'envelopeId',
  'createdAt',
])
export class EsignAuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  envelopeId: string;

  @ManyToOne(() => EsignEnvelopeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'envelopeId' })
  envelope?: EsignEnvelopeEntity;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 100 })
  action: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
