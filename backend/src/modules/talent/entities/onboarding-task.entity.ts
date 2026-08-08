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
import { OnboardingTaskStatus } from '../enums/onboarding.enum';
import { OnboardingCaseEntity } from './onboarding-case.entity';
import { OnboardingTemplateTaskEntity } from './onboarding-template-task.entity';

@Entity('onboarding_tasks')
@Index('IDX_onboarding_tasks_case', ['caseId', 'status'])
export class OnboardingTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  caseId: string;

  @ManyToOne(() => OnboardingCaseEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'caseId' })
  onboardingCase?: OnboardingCaseEntity;

  @Column({ type: 'uuid', nullable: true })
  templateTaskId: string | null;

  @ManyToOne(() => OnboardingTemplateTaskEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'templateTaskId' })
  templateTask?: OnboardingTemplateTaskEntity | null;

  @Column({
    type: 'enum',
    enum: OnboardingTaskStatus,
    enumName: 'onboarding_task_status_enum',
    default: OnboardingTaskStatus.PENDING,
  })
  status: OnboardingTaskStatus;

  @Column({ type: 'uuid', nullable: true })
  assigneeWorkerId: string | null;

  @ManyToOne(() => WorkerEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigneeWorkerId' })
  assigneeWorker?: WorkerEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
