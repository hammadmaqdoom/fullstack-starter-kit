import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  ControlTestResult,
  ControlTestTrigger,
} from '../enums/control.enum';
import { ComplianceControlEntity } from './compliance-control.entity';
import { TenantEntity } from './tenant.entity';

@Entity('control_test_runs')
@Index('IDX_control_test_runs_tenant_control_ran', [
  'tenantId',
  'controlId',
  'ranAt',
])
export class ControlTestRunEntity {
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

  @Column({ type: 'timestamptz' })
  ranAt: Date;

  @Column({
    type: 'enum',
    enum: ControlTestTrigger,
    enumName: 'control_test_trigger_enum',
  })
  triggeredBy: ControlTestTrigger;

  @Column({ type: 'uuid', nullable: true })
  actorUserId: string | null;

  @Column({
    type: 'enum',
    enum: ControlTestResult,
    enumName: 'control_test_result_enum',
  })
  result: ControlTestResult;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  summary: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  evidenceRefs: unknown[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
