import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VisaAttachmentType } from '../enums/onboarding.enum';
import { WorkerPassportEntity } from './worker-passport.entity';
import { WorkerVisaRecordEntity } from './worker-visa-record.entity';

@Entity('worker_visa_attachments')
export class WorkerVisaAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid', nullable: true })
  visaRecordId: string | null;

  @ManyToOne(() => WorkerVisaRecordEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'visaRecordId' })
  visaRecord?: WorkerVisaRecordEntity | null;

  @Column({ type: 'uuid', nullable: true })
  passportId: string | null;

  @ManyToOne(() => WorkerPassportEntity, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'passportId' })
  passport?: WorkerPassportEntity | null;

  @Column({
    type: 'enum',
    enum: VisaAttachmentType,
    enumName: 'worker_visa_attachment_type_enum',
  })
  attachmentType: VisaAttachmentType;

  @Column({ type: 'varchar', length: 500 })
  blobUrl: string;

  @Column({ type: 'uuid', nullable: true })
  uploadedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  uploadedAt: Date;
}
