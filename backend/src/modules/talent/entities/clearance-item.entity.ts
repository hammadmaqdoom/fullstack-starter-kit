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
export class ClearanceItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
  clearedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  clearedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
