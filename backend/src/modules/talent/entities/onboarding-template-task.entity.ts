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
import { OnboardingAssigneeRole } from '../enums/onboarding.enum';
import { OnboardingTemplateEntity } from './onboarding-template.entity';

@Entity('onboarding_template_tasks')
@Index('IDX_onboarding_template_tasks_template', ['templateId', 'sortOrder'])
export class OnboardingTemplateTaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  templateId: string;

  @ManyToOne(() => OnboardingTemplateEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'templateId' })
  template?: OnboardingTemplateEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: OnboardingAssigneeRole,
    enumName: 'onboarding_assignee_role_enum',
  })
  assigneeRole: OnboardingAssigneeRole;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isRequired: boolean;

  @Column({ type: 'int', default: 0 })
  dueOffsetDays: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
