import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { EmploymentTypeEntity } from '@/modules/country-config/entities/employment-type.entity';
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
import { OnboardingTemplateStatus } from '../enums/onboarding.enum';
import type { OnboardingTemplateTaskEntity } from './onboarding-template-task.entity';

@Entity('onboarding_templates')
@Index('IDX_onboarding_templates_tenant_status', ['tenantId', 'status'])
export class OnboardingTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'uuid', nullable: true })
  employmentTypeId: string | null;

  @ManyToOne(() => EmploymentTypeEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'employmentTypeId' })
  employmentType?: EmploymentTypeEntity | null;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({
    type: 'enum',
    enum: OnboardingTemplateStatus,
    enumName: 'onboarding_template_status_enum',
    default: OnboardingTemplateStatus.DRAFT,
  })
  status: OnboardingTemplateStatus;

  /** Inverse side — string relation name avoids circular import with template-task entity. */
  @OneToMany('OnboardingTemplateTaskEntity', 'template', { cascade: true })
  tasks?: OnboardingTemplateTaskEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
