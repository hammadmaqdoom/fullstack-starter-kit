import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ExitInterviewStatus } from '../enums/onboarding.enum';
import { SeparationCaseEntity } from './separation-case.entity';

/**
 * Restricted — People Ops only. Responses may contain sensitive feedback.
 * Field redaction applied in service for non–People Ops callers.
 */
@Entity('exit_interviews')
@Unique('UQ_exit_interviews_separation', ['tenantId', 'separationCaseId'])
export class ExitInterviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  separationCaseId: string;

  @ManyToOne(() => SeparationCaseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'separationCaseId' })
  separationCase?: SeparationCaseEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({
    type: 'enum',
    enum: ExitInterviewStatus,
    enumName: 'exit_interview_status_enum',
    default: ExitInterviewStatus.DRAFT,
  })
  status: ExitInterviewStatus;

  @Column({ type: 'jsonb', default: {} })
  responses: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  conductedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  conductedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
