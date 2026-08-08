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
  UpdateDateColumn,
} from 'typeorm';
import {
  PunchCorrectionStatus,
  PunchType,
} from '../enums/attendance.enum';
import { AttendancePunchEntity } from './attendance-punch.entity';

@Entity('punch_correction_requests')
@Index('IDX_punch_corrections_worker_status', [
  'tenantId',
  'workerId',
  'status',
])
export class PunchCorrectionRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'uuid', nullable: true })
  punchId: string | null;

  @ManyToOne(() => AttendancePunchEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'punchId' })
  punch?: AttendancePunchEntity | null;

  @Column({ type: 'timestamptz' })
  requestedAt: Date;

  @Column({
    type: 'enum',
    enum: PunchType,
    enumName: 'punch_type_enum',
  })
  proposedType: PunchType;

  @Column({ type: 'timestamptz' })
  proposedTime: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: PunchCorrectionStatus,
    enumName: 'punch_correction_status_enum',
    default: PunchCorrectionStatus.SUBMITTED,
  })
  status: PunchCorrectionStatus;

  @Column({ type: 'uuid', nullable: true })
  approverId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
