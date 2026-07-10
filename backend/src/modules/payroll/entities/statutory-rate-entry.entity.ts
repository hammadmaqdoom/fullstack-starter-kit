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
import { StatutoryRateUnit } from '../enums/payroll.enum';
import { StatutoryRateScheduleEntity } from './statutory-rate-schedule.entity';

@Entity('statutory_rate_entries')
@Index('IDX_statutory_rate_entries_schedule', ['tenantId', 'scheduleId'])
export class StatutoryRateEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  scheduleId: string;

  @ManyToOne(() => StatutoryRateScheduleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'scheduleId' })
  schedule?: StatutoryRateScheduleEntity;

  @Column({ type: 'varchar', length: 50 })
  rateKey: string;

  @Column({ type: 'decimal', precision: 10, scale: 6 })
  rateValue: string;

  @Column({
    type: 'enum',
    enum: StatutoryRateUnit,
    enumName: 'statutory_rate_unit_enum',
  })
  rateUnit: StatutoryRateUnit;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
