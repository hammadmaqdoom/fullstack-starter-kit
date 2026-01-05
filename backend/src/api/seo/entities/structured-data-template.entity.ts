import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index } from 'typeorm';
import { SchemaType } from './json-ld-schema.entity';

@Entity('structured_data_templates')
export class StructuredDataTemplateEntity extends BaseModel {
  @Column({
    type: 'enum',
    enum: SchemaType,
  })
  schemaType: SchemaType;

  @Column({ type: 'jsonb' })
  templateJSON: Record<string, any>;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contentTypeMapping?: string;

  @Column({ type: 'boolean', default: false })
  autoGenerate: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

