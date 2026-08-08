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
} from 'typeorm';
import { FeedbackType } from '../enums/performance.enum';

@Entity('feedback_entries')
@Index('IDX_feedback_recipient', ['tenantId', 'recipientWorkerId'])
@Index('IDX_feedback_author', ['tenantId', 'authorWorkerId'])
export class FeedbackEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  authorWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorWorkerId' })
  authorWorker?: WorkerEntity;

  @Column({ type: 'uuid' })
  recipientWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientWorkerId' })
  recipientWorker?: WorkerEntity;

  @Column({ type: 'enum', enum: FeedbackType })
  feedbackType: FeedbackType;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  competencyTag: string | null;

  @Column({ type: 'boolean', default: true })
  isPrivate: boolean;

  @Column({ type: 'uuid' })
  authorUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('recognition_entries')
@Index('IDX_recognition_recipient', ['tenantId', 'recipientWorkerId'])
export class RecognitionEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  authorWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorWorkerId' })
  authorWorker?: WorkerEntity;

  @Column({ type: 'uuid' })
  recipientWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientWorkerId' })
  recipientWorker?: WorkerEntity;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  valueTag: string | null;

  @Column({ type: 'uuid' })
  authorUserId: string;

  @CreateDateColumn()
  createdAt: Date;
}
