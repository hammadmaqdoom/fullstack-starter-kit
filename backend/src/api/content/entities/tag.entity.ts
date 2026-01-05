import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { ContentEntity } from './content.entity';

@Entity('tags')
export class TagEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToMany(() => ContentEntity, (content) => content.tags)
  contents?: ContentEntity[];
}

