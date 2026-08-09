import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { LeaveTypeEntity } from '@/modules/country-config/entities/leave-type.entity';
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
import { LeaveRequestStatus } from '../enums/leave.enum';

@Entity('leave_requests')
@Index('IDX_leave_requests_worker_status', ['tenantId', 'workerId', 'status'])
@Index('IDX_leave_requests_approver_status', ['tenantId', 'approverId', 'status'])
export class LeaveRequestEntity {
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

  @Column({ type: 'uuid' })
  leaveTypeId: string;

  @ManyToOne(() => LeaveTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'leaveTypeId' })
  leaveType?: LeaveTypeEntity;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  days: string;

  @Column({ type: 'boolean', default: false })
  isHalfDay: boolean;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: LeaveRequestStatus,
    enumName: 'leave_request_status_enum',
    default: LeaveRequestStatus.SUBMITTED,
  })
  status: LeaveRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  approverId: string | null;

  @Column({ type: 'uuid', nullable: true })
  managerId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
