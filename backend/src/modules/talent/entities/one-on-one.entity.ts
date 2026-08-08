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
import { OneOnOneStatus } from '../enums/performance.enum';

@Entity('one_on_one_meetings')
@Index('IDX_one_on_ones_manager', [
  'tenantId',
  'managerWorkerId',
  'scheduledAt',
])
@Index('IDX_one_on_ones_employee', [
  'tenantId',
  'employeeWorkerId',
  'scheduledAt',
])
export class OneOnOneMeetingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  managerWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'managerWorkerId' })
  managerWorker?: WorkerEntity;

  @Column({ type: 'uuid' })
  employeeWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeWorkerId' })
  employeeWorker?: WorkerEntity;

  @Column({ type: 'timestamptz' })
  scheduledAt: Date;

  @Column({
    type: 'enum',
    enum: OneOnOneStatus,
    default: OneOnOneStatus.SCHEDULED,
  })
  status: OneOnOneStatus;

  @Column({ type: 'text', nullable: true })
  agenda: string | null;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('one_on_one_notes')
@Index('IDX_one_on_one_notes_meeting', ['tenantId', 'meetingId'])
export class OneOnOneNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  meetingId: string;

  @ManyToOne(() => OneOnOneMeetingEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meetingId' })
  meeting?: OneOnOneMeetingEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isShared: boolean;

  @Column({ type: 'uuid' })
  authorUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
