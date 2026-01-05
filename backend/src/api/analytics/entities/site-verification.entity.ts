import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index } from 'typeorm';

export enum VerificationPlatform {
  GOOGLE = 'GOOGLE',
  BING = 'BING',
  YANDEX = 'YANDEX',
  FACEBOOK = 'FACEBOOK',
  PINTEREST = 'PINTEREST',
}

@Entity('site_verification')
export class SiteVerificationEntity extends BaseModel {
  @Index({ unique: true, where: '"deletedAt" IS NULL' })
  @Column({
    type: 'enum',
    enum: VerificationPlatform,
  })
  platform: VerificationPlatform;

  @Column({ type: 'varchar', length: 255 })
  verificationCode: string;

  @Column({ type: 'text', nullable: true })
  metaTag?: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastChecked?: Date;
}

