import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApprovalStatus } from '../enums/org.enum';
import { WorkerEntity } from './worker.entity';

export type ProfileFieldChange = Record<
  string,
  { old: unknown; new: unknown }
>;

@Entity('profile_change_requests')
export class ProfileChangeRequestEntity {
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

  @Column({ type: 'jsonb' })
  fieldChanges: ProfileFieldChange;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    enumName: 'approval_status_enum',
    default: ApprovalStatus.SUBMITTED,
  })
  status: ApprovalStatus;

  @Column({ type: 'uuid', nullable: true })
  approverId: string | null;

  @ManyToOne(() => WorkerEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'approverId' })
  approver?: WorkerEntity | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
