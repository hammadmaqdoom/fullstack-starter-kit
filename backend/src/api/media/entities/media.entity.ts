import { UserEntity } from '@/auth/entities/user.entity';
import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

@Entity('media')
export class MediaEntity extends BaseModel {
  @Column({ type: 'varchar', length: 255 })
  filename: string;

  @Column({ type: 'varchar', length: 500 })
  url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  @Column({ type: 'bigint', nullable: true })
  fileSize?: number;

  @Column({ type: 'int', nullable: true })
  width?: number;

  @Column({ type: 'int', nullable: true })
  height?: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  altText?: string;

  @Column({ type: 'text', nullable: true })
  caption?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  title?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column()
  uploadedByUserId: string;

  @ManyToOne(() => UserEntity, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedBy: UserEntity;
}

