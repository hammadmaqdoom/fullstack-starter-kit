import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { HelpDeskTicketEntity } from './help-desk-ticket.entity';

@Entity('ticket_comments')
@Index('IDX_ticket_comments_tenant_ticket', ['tenantId', 'ticketId'])
export class TicketCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  ticketId: string;

  @ManyToOne(() => HelpDeskTicketEntity, (ticket) => ticket.comments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'ticketId' })
  ticket?: HelpDeskTicketEntity;

  @Column({ type: 'uuid' })
  authorId: string;

  @Column({ type: 'text' })
  body: string;

  /** Internal notes (staff-only) never shown to the requester. */
  @Column({ type: 'boolean', default: false })
  isInternal: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
