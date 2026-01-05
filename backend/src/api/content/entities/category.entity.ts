import { BaseModel } from '@/database/models/base.model';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ContentEntity } from './content.entity';

@Entity('categories')
export class CategoryEntity extends BaseModel {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ nullable: true })
  parentId?: string;

  @ManyToOne(() => CategoryEntity, (category) => category.children, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent?: CategoryEntity;

  @OneToMany(() => CategoryEntity, (category) => category.parent)
  children?: CategoryEntity[];

  @OneToMany(() => ContentEntity, (content) => content.category)
  contents?: ContentEntity[];
}

