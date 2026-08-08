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
import { AttendanceDayStatus } from '../enums/attendance.enum';

@Entity('attendance_day_summaries')
@Index('IDX_attendance_day_summaries_unique', ['tenantId', 'workerId', 'workDate'], {
  unique: true,
})
export class AttendanceDaySummaryEntity {
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

  @Column({ type: 'date' })
  workDate: string;

  @Column({
    type: 'enum',
    enum: AttendanceDayStatus,
    enumName: 'attendance_day_status_enum',
    default: AttendanceDayStatus.MISSING,
  })
  status: AttendanceDayStatus;

  @Column({ type: 'timestamptz', nullable: true })
  firstIn: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastOut: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
