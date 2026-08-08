import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
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
import {
  HelpDeskPriority,
  HelpDeskQueue,
  HelpDeskStatus,
} from '../enums/help-desk.enum';
import type { TicketCommentEntity } from './ticket-comment.entity';

@Entity('help_desk_tickets')
@Index('IDX_help_desk_tickets_tenant_requester', ['tenantId', 'requesterId'])
@Index('IDX_help_desk_tickets_tenant_queue_status', [
  'tenantId',
  'queue',
  'status',
])
@Index('IDX_help_desk_tickets_tenant_assignee', ['tenantId', 'assigneeId'])
export class HelpDeskTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  requesterId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'requesterId' })
  requester?: WorkerEntity;

  @Column({ type: 'uuid', nullable: true })
  assigneeId: string | null;

  @ManyToOne(() => WorkerEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: WorkerEntity | null;

  @Column({
    type: 'enum',
    enum: HelpDeskQueue,
    enumName: 'help_desk_queue_enum',
  })
  queue: HelpDeskQueue;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: HelpDeskPriority,
    enumName: 'help_desk_priority_enum',
    default: HelpDeskPriority.P3,
  })
  priority: HelpDeskPriority;

  @Column({
    type: 'enum',
    enum: HelpDeskStatus,
    enumName: 'help_desk_status_enum',
    default: HelpDeskStatus.OPEN,
  })
  status: HelpDeskStatus;

  @Column({ type: 'jsonb', default: [] })
  attachments: string[];

  @Column({ type: 'int', nullable: true })
  slaTargetHours: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  slaDueAt: Date | null;

  @Column({ type: 'boolean', default: false })
  slaBreached: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  /** Inverse side — string relation name avoids circular import with ticket-comment.entity. */
  @OneToMany('TicketCommentEntity', 'ticket')
  comments?: TicketCommentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
