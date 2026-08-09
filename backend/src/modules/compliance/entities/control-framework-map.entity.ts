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

@Entity('control_framework_maps')
@Index(
  'UQ_control_framework_maps_tenant_ctrl_fw_ref',
  ['tenantId', 'controlId', 'framework', 'externalRef'],
  { unique: true },
)
export class ControlFrameworkMapEntity {
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

  @Column({ type: 'varchar', length: 32 })
  framework: string;

  @Column({ type: 'varchar', length: 128 })
  externalRef: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
