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
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ShiftType } from '../enums/shift-roster.enum';
import { ShiftRosterEntity } from './shift-roster.entity';

@Entity('shift_assignments')
@Unique('UQ_shift_assignments_worker_date', [
  'tenantId',
  'workerId',
  'shiftDate',
])
@Index('IDX_shift_assignments_roster_date', ['tenantId', 'shiftRosterId', 'shiftDate'])
export class ShiftAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  shiftRosterId: string;

  @ManyToOne(() => ShiftRosterEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shiftRosterId' })
  roster?: ShiftRosterEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'date' })
  shiftDate: string;

  @Column({
    type: 'enum',
    enum: ShiftType,
    enumName: 'shift_type_enum',
    default: ShiftType.MORNING,
  })
  shiftType: ShiftType;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
