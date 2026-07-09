import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import { SetupWizardStep } from '../enums/setup-wizard.enum';

@Entity('setup_wizard_progress')
@Index('IDX_setup_wizard_progress_tenant', ['tenantId'], { unique: true })
export class SetupWizardProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({
    type: 'varchar',
    length: 50,
    default: SetupWizardStep.ORGANISATION,
  })
  currentStep: SetupWizardStep;

  @Column({ type: 'jsonb', default: [] })
  completedSteps: SetupWizardStep[];

  @Column({ type: 'jsonb', default: [] })
  skippedSteps: SetupWizardStep[];

  @Column({ type: 'jsonb', default: {} })
  stepData: Record<string, unknown>;

  @Column({ type: 'boolean', default: false })
  isComplete: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
