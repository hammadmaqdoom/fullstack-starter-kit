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

@Entity('notification_preferences')
@Index('IDX_notification_preferences_user', ['tenantId', 'userId'], {
  unique: true,
})
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'boolean', default: true })
  emailApprovals: boolean;

  @Column({ type: 'boolean', default: true })
  emailLeave: boolean;

  @Column({ type: 'boolean', default: true })
  emailPolicies: boolean;

  @Column({ type: 'boolean', default: false })
  pushEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  teamsAdaptiveCards: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
