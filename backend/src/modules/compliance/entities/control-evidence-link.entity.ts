import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ComplianceControlEntity } from './compliance-control.entity';
import { TenantEntity } from './tenant.entity';

@Entity('control_evidence_links')
@Index('IDX_control_evidence_links_tenant_control', ['tenantId', 'controlId'])
export class ControlEvidenceLinkEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  controlId: string;

  @ManyToOne(() => ComplianceControlEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'controlId' })
  control?: ComplianceControlEntity;

  @Column({ type: 'varchar', length: 255 })
  label: string;

  @Column({ type: 'text' })
  urlOrPath: string;

  @Column({ type: 'timestamptz' })
  collectedAt: Date;

  @Column({ type: 'uuid' })
  collectedBy: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
