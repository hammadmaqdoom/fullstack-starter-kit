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
import { KeyResultStatus } from '../enums/performance.enum';
import { OrganizationalObjectiveEntity } from './organizational-objective.entity';

@Entity('objective_key_results')
@Index('IDX_key_results_objective', ['tenantId', 'objectiveId'])
export class ObjectiveKeyResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  objectiveId: string;

  @ManyToOne(() => OrganizationalObjectiveEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'objectiveId' })
  objective?: OrganizationalObjectiveEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  targetValue: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, default: 0 })
  currentValue: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit: string | null;

  @Column({
    type: 'enum',
    enum: KeyResultStatus,
    default: KeyResultStatus.NOT_STARTED,
  })
  status: KeyResultStatus;

  @Column({ type: 'int', default: 0 })
  weightPercent: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
