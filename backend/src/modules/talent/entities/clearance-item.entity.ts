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
  ClearanceCategory,
  ClearanceItemStatus,
} from '../enums/onboarding.enum';
import { SeparationCaseEntity } from './separation-case.entity';

@Entity('clearance_items')
@Index('IDX_clearance_items_case', ['separationCaseId', 'status'])
@Index('IDX_clearance_items_tenant', ['tenantId'])
export class ClearanceItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  separationCaseId: string;

  @ManyToOne(() => SeparationCaseEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'separationCaseId' })
  separationCase?: SeparationCaseEntity;

  @Column({
    type: 'enum',
    enum: ClearanceCategory,
    enumName: 'clearance_category_enum',
  })
  category: ClearanceCategory;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: ClearanceItemStatus,
    enumName: 'clearance_item_status_enum',
    default: ClearanceItemStatus.PENDING,
  })
  status: ClearanceItemStatus;

  @Column({ type: 'uuid', nullable: true })
  ownerWorkerId: string | null;

  @ManyToOne(() => WorkerEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ownerWorkerId' })
  ownerWorker?: WorkerEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  dueAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isBlocking: boolean;

  @Column({ type: 'uuid', nullable: true })
  clearedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  clearedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
