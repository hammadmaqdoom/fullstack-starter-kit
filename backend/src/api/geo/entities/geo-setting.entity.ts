import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index } from 'typeorm';

@Entity('geo_settings')
export class GeoSettingEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 10 })
  countryCode: string;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 10 })
  languageCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  region?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency?: string;

  @Column({ type: 'jsonb', nullable: true })
  hreflangConfig?: {
    enabled: boolean;
    defaultLocale?: string;
    alternateLocales?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  regionalSchemaOverrides?: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  regionalAnalyticsOverrides?: Record<string, any>;
}

