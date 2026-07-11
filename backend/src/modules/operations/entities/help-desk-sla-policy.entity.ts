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
import { HelpDeskPriority, HelpDeskQueue } from '../enums/help-desk.enum';

/** Config table — SLA target hours by queue + priority (PRD §6.18.1), e.g. IT P1 = 4h. */
@Entity('help_desk_sla_policies')
@Index(
  'IDX_help_desk_sla_policies_tenant_queue_priority',
  ['tenantId', 'queue', 'priority'],
  { unique: true },
)
export class HelpDeskSlaPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({
    type: 'enum',
    enum: HelpDeskQueue,
    enumName: 'help_desk_queue_enum',
  })
  queue: HelpDeskQueue;

  @Column({
    type: 'enum',
    enum: HelpDeskPriority,
    enumName: 'help_desk_priority_enum',
  })
  priority: HelpDeskPriority;

  @Column({ type: 'int' })
  slaTargetHours: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
