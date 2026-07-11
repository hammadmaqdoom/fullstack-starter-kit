import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TrainingVerificationMethod } from '../enums/training.enum';
import { TrainingAssignmentEntity } from './training-assignment.entity';

@Entity('training_completions')
@Index(
  'IDX_training_completions_tenant_assignment',
  ['tenantId', 'assignmentId'],
  {
    unique: true,
  },
)
export class TrainingCompletionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  assignmentId: string;

  @ManyToOne(() => TrainingAssignmentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment?: TrainingAssignmentEntity;

  @Column({ type: 'timestamptz' })
  completedAt: Date;

  @Column({
    type: 'enum',
    enum: TrainingVerificationMethod,
    enumName: 'training_verification_method_enum',
    default: TrainingVerificationMethod.SELF_ATTEST,
  })
  verificationMethod: TrainingVerificationMethod;

  @Column({ type: 'uuid', nullable: true })
  verifiedByUserId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  certificateBlobUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
