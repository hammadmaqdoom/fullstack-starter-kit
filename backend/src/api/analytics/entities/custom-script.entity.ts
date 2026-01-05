import { UserEntity } from '@/auth/entities/user.entity';
import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Environment } from './analytics-config.entity';

export enum ScriptPosition {
  HEAD_START = 'head-start',
  HEAD_END = 'head-end',
  BODY_START = 'body-start',
  BODY_END = 'body-end',
}

@Entity('custom_scripts')
export class CustomScriptEntity extends BaseModel {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text' })
  scriptContent: string;

  @Column({
    type: 'enum',
    enum: ScriptPosition,
    default: ScriptPosition.HEAD_END,
  })
  position: ScriptPosition;

  @Column({ type: 'jsonb', nullable: true })
  targetPages?: {
    type: 'all' | 'specific';
    paths?: string[];
  };

  @Column({ type: 'jsonb', nullable: true })
  contentTypes?: string[];

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    type: 'enum',
    enum: Environment,
    default: Environment.ALL,
  })
  environment: Environment;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  createdByUserId?: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'createdByUserId' })
  createdBy?: UserEntity;
}

