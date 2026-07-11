import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import {
  TrainingAssignmentSource,
  TrainingAssignmentStatus,
} from '../enums/training.enum';
import { TrainingCourseEntity } from './training-course.entity';

@Entity('training_assignments')
@Index('IDX_training_assignments_tenant_worker', ['tenantId', 'workerId'])
@Index('IDX_training_assignments_tenant_course', ['tenantId', 'courseId'])
@Index('IDX_training_assignments_tenant_status', ['tenantId', 'status'])
export class TrainingAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  courseId: string;

  @ManyToOne(() => TrainingCourseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course?: TrainingCourseEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({
    type: 'enum',
    enum: TrainingAssignmentStatus,
    enumName: 'training_assignment_status_enum',
    default: TrainingAssignmentStatus.ASSIGNED,
  })
  status: TrainingAssignmentStatus;

  @Column({
    type: 'enum',
    enum: TrainingAssignmentSource,
    enumName: 'training_assignment_source_enum',
    default: TrainingAssignmentSource.MANUAL,
  })
  source: TrainingAssignmentSource;

  @Column({ type: 'uuid' })
  assignedByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
