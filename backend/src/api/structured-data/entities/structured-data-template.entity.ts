import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index } from 'typeorm';

@Entity('structured_data_templates')
export class StructuredDataTemplateEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50 })
  schemaType: string;

  @Column({ type: 'jsonb' })
  templateData: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  variables?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  usageCount: number;
}

