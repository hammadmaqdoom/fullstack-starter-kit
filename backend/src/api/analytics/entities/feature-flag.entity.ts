import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index } from 'typeorm';
import { Environment } from './analytics-config.entity';

@Entity('feature_flags')
export class FeatureFlagEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 100 })
  flagName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isEnabled: boolean;

  @Column({
    type: 'enum',
    enum: Environment,
    default: Environment.ALL,
  })
  environment: Environment;
}

