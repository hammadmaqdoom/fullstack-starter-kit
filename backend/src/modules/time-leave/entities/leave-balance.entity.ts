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

@Entity('leave_balances')
@Index('IDX_leave_balances_unique', ['tenantId', 'workerId', 'leaveTypeId', 'year'], {
  unique: true,
})
export class LeaveBalanceEntity {
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

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  entitled: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  used: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  pending: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
