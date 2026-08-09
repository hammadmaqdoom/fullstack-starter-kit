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
import {
  ControlDomain,
  ControlFrequency,
  ControlOwnerRole,
} from '../enums/control.enum';
import { TenantEntity } from './tenant.entity';

@Entity('compliance_controls')
@Index('UQ_compliance_controls_tenant_code', ['tenantId', 'code'], {
  unique: true,
})
export class ComplianceControlEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 64 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ControlDomain,
    enumName: 'control_domain_enum',
  })
  domain: ControlDomain;

  @Column({
    type: 'enum',
    enum: ControlOwnerRole,
    enumName: 'control_owner_role_enum',
  })
  ownerRole: ControlOwnerRole;

  @Column({
    type: 'enum',
    enum: ControlFrequency,
    enumName: 'control_frequency_enum',
  })
  frequency: ControlFrequency;

  @Column({ type: 'boolean', default: true })
  inScope: boolean;

  @Column({ type: 'varchar', length: 64, nullable: true })
  testAdapterKey: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
