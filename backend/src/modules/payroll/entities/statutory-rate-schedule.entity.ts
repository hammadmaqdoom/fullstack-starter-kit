import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LegalEntityEntity } from '@/modules/core-hr/entities/legal-entity.entity';
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
import { StatutoryScheduleStatus } from '../enums/payroll.enum';
import type { StatutoryRateEntryEntity } from './statutory-rate-entry.entity';

@Entity('statutory_rate_schedules')
@Index('IDX_statutory_rate_schedules_scope', [
  'tenantId',
  'legalEntityId',
  'countryCode',
  'status',
])
export class StatutoryRateScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  legalEntityId: string;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({
    type: 'enum',
    enum: StatutoryScheduleStatus,
    enumName: 'statutory_schedule_status_enum',
    default: StatutoryScheduleStatus.DRAFT,
  })
  status: StatutoryScheduleStatus;

  /** Inverse side — string relation name avoids circular import with rate-entry entity. */
  @OneToMany('StatutoryRateEntryEntity', 'schedule')
  entries?: StatutoryRateEntryEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
