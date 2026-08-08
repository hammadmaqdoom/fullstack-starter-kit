import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
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
import { SeparationCaseStatus } from '../enums/onboarding.enum';
import type { ClearanceItemEntity } from './clearance-item.entity';

@Entity('separation_cases')
@Index('IDX_separation_cases_tenant_status', ['tenantId', 'status'])
@Index('IDX_separation_cases_worker', ['tenantId', 'workerId'])
export class SeparationCaseEntity {
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
  lastWorkingDay: string;

  @Column({
    type: 'enum',
    enum: SeparationCaseStatus,
    enumName: 'separation_case_status_enum',
    default: SeparationCaseStatus.INITIATED,
  })
  status: SeparationCaseStatus;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** Inverse side — string relation name avoids circular import with clearance-item entity. */
  @OneToMany('ClearanceItemEntity', 'separationCase', { cascade: true })
  clearanceItems?: ClearanceItemEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
