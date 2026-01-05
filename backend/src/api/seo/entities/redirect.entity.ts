import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index } from 'typeorm';

export enum RedirectType {
  PERMANENT = 301,
  TEMPORARY = 302,
}

@Entity('content_redirects')
export class RedirectEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 500 })
  fromPath: string;

  @Column({ type: 'varchar', length: 500 })
  toPath: string;

  @Column({
    type: 'enum',
    enum: RedirectType,
    default: RedirectType.PERMANENT,
  })
  type: RedirectType;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}

