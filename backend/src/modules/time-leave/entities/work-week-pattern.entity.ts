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
import { WorkWeekScopeType } from '../enums/calendar.enum';

@Entity('work_week_patterns')
@Index('IDX_work_week_patterns_tenant_scope', [
  'tenantId',
  'scopeType',
  'scopeId',
])
export class WorkWeekPatternEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({
    type: 'enum',
    enum: WorkWeekScopeType,
    enumName: 'work_week_scope_type_enum',
  })
  scopeType: WorkWeekScopeType;

  @Column({ type: 'uuid', nullable: true })
  scopeId: string | null;

  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'jsonb' })
  daysJson: Record<string, unknown>;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
