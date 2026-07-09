import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HolidayCalendarEntity } from './holiday-calendar.entity';

@Entity('holidays')
@Index('IDX_holidays_calendar_date', ['holidayCalendarId', 'holidayDate'])
export class HolidayEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  holidayCalendarId: string;

  @ManyToOne(() => HolidayCalendarEntity, (calendar) => calendar.holidays, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'holidayCalendarId' })
  calendar?: HolidayCalendarEntity;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'date' })
  holidayDate: string;

  @Column({ type: 'boolean', default: false })
  isCompanyClosure: boolean;

  @Column({ type: 'boolean', default: false })
  isOptionalWorking: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
