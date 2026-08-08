import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { DivisionEntity } from '@/modules/core-hr/entities/division.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ShiftAssignmentEntity } from './shift-assignment.entity';

@Entity('shift_rosters')
@Index('IDX_shift_rosters_tenant_division', ['tenantId', 'divisionId'])
@Index('IDX_shift_rosters_effective', [
  'tenantId',
  'effectiveFrom',
  'effectiveTo',
])
export class ShiftRosterEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  @ManyToOne(() => DivisionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'divisionId' })
  division?: DivisionEntity | null;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  /** Inverse side — string relation name avoids circular import with assignment entity. */
  @OneToMany('ShiftAssignmentEntity', 'roster')
  assignments?: ShiftAssignmentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
