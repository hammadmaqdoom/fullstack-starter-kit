import { UserEntity } from '@/auth/entities/user.entity';
import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

export enum AnalyticsPlatform {
  GTM = 'GTM',
  GA4 = 'GA4',
  FACEBOOK_PIXEL = 'FACEBOOK_PIXEL',
  PINTEREST_TAG = 'PINTEREST_TAG',
  YANDEX_METRICA = 'YANDEX_METRICA',
  CUSTOM = 'CUSTOM',
}

export enum Environment {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
  ALL = 'all',
}

@Entity('analytics_configs')
export class AnalyticsConfigEntity extends BaseModel {
  @Index({ where: '"deletedAt" IS NULL' })
  @Column({
    type: 'enum',
    enum: AnalyticsPlatform,
  })
  platform: AnalyticsPlatform;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  trackingId: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: Environment,
    default: Environment.ALL,
  })
  environment: Environment;

  @Column({ type: 'jsonb', nullable: true })
  additionalConfig?: Record<string, any>;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  createdByUserId?: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy?: UserEntity;
}

