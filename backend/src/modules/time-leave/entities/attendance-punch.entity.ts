import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { WorkMode } from '@/modules/core-hr/enums/worker.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PunchSource, PunchType } from '../enums/attendance.enum';

@Entity('attendance_punches')
@Index('IDX_attendance_punches_worker_punched', [
  'tenantId',
  'workerId',
  'punchedAt',
])
export class AttendancePunchEntity {
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

  @Column({
    type: 'enum',
    enum: PunchType,
    enumName: 'punch_type_enum',
  })
  punchType: PunchType;

  @Column({ type: 'timestamptz' })
  punchedAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: string | null;

  @Column({
    type: 'enum',
    enum: WorkMode,
    enumName: 'work_mode_enum',
    nullable: true,
  })
  workMode: WorkMode | null;

  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  accuracyMeters: string | null;

  @Column({ type: 'boolean', nullable: true })
  officeMatch: boolean | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceInfo: string | null;

  @Column({
    type: 'enum',
    enum: PunchSource,
    enumName: 'punch_source_enum',
    default: PunchSource.WEB,
  })
  source: PunchSource;

  @Column({ type: 'varchar', length: 64, default: 'UTC' })
  timezone: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
