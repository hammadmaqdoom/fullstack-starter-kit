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
  StaffCalendarDayType,
  StaffCalendarSource,
} from '../enums/calendar.enum';
import { LeaveRequestEntity } from './leave-request.entity';

@Entity('staff_calendar_days')
@Index(
  'IDX_staff_calendar_days_unique',
  ['tenantId', 'workerId', 'calendarDate'],
  { unique: true },
)
export class StaffCalendarDayEntity {
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
  calendarDate: string;

  @Column({
    type: 'enum',
    enum: StaffCalendarDayType,
    enumName: 'staff_calendar_day_type_enum',
  })
  dayType: StaffCalendarDayType;

  @Column({ type: 'uuid', nullable: true })
  leaveRequestId: string | null;

  @ManyToOne(() => LeaveRequestEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'leaveRequestId' })
  leaveRequest?: LeaveRequestEntity | null;

  @Column({
    type: 'enum',
    enum: StaffCalendarSource,
    enumName: 'staff_calendar_source_enum',
    default: StaffCalendarSource.AUTO_GENERATED,
  })
  source: StaffCalendarSource;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
