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
import { TrainingCourseType } from '../enums/training.enum';

@Entity('training_courses')
@Index('IDX_training_courses_tenant_active', ['tenantId', 'isActive'])
export class TrainingCourseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: TrainingCourseType,
    enumName: 'training_course_type_enum',
    default: TrainingCourseType.OPTIONAL,
  })
  courseType: TrainingCourseType;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({ type: 'int', nullable: true })
  renewalPeriodMonths: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  externalUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  attachmentBlobUrl: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  countsTowardAwarenessControl: boolean;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
