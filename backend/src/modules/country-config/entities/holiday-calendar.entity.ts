import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import { HolidayEntity } from './holiday.entity';

@Entity('holiday_calendars')
@Index('IDX_holiday_calendars_tenant_country', [
  'tenantId',
  'countryCode',
  'effectiveYear',
])
export class HolidayCalendarEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  effectiveYear: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => HolidayEntity, (holiday) => holiday.calendar)
  holidays?: HolidayEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
