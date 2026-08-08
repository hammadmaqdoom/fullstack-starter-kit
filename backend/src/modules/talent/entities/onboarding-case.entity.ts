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
import { OnboardingCaseStatus } from '../enums/onboarding.enum';
import type { OnboardingTaskEntity } from './onboarding-task.entity';
import { OnboardingTemplateEntity } from './onboarding-template.entity';

@Entity('onboarding_cases')
@Index('IDX_onboarding_cases_tenant_status', ['tenantId', 'status'])
@Index('IDX_onboarding_cases_worker', ['tenantId', 'workerId'])
export class OnboardingCaseEntity {
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
  templateId: string;

  @ManyToOne(() => OnboardingTemplateEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'templateId' })
  template?: OnboardingTemplateEntity;

  @Column({
    type: 'enum',
    enum: OnboardingCaseStatus,
    enumName: 'onboarding_case_status_enum',
    default: OnboardingCaseStatus.NOT_STARTED,
  })
  status: OnboardingCaseStatus;

  @Column({ type: 'date' })
  startDate: string;

  /** Inverse side — string relation name avoids circular import with task entity. */
  @OneToMany('OnboardingTaskEntity', 'onboardingCase', { cascade: true })
  tasks?: OnboardingTaskEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
