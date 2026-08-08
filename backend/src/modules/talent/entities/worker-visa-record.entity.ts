import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  VisaApplicationStatus,
  VisaRecordType,
} from '../enums/onboarding.enum';
import { WorkerPassportEntity } from './worker-passport.entity';
import type { WorkerVisaAttachmentEntity } from './worker-visa-attachment.entity';

@Entity('worker_visa_records')
@Index('IDX_worker_visa_records_worker_country', [
  'tenantId',
  'workerId',
  'countryCode',
  'recordType',
])
export class WorkerVisaRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  /** ISO country code from country-config (e.g. AE, SG) — no hard-coded branches. */
  @Column({ type: 'varchar', length: 2 })
  countryCode: string;

  @Column({
    type: 'enum',
    enum: VisaRecordType,
    enumName: 'worker_visa_record_type_enum',
  })
  recordType: VisaRecordType;

  @Column({ type: 'varchar', length: 50 })
  statusCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  visaOrPassType: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  documentNumber: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  sponsorOrEmployer: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uidNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  labourCardNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  emiratesId: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nric: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipaReference: string | null;

  @Column({
    type: 'enum',
    enum: VisaApplicationStatus,
    enumName: 'worker_visa_application_status_enum',
    nullable: true,
  })
  applicationStatus: VisaApplicationStatus | null;

  @Column({ type: 'date', nullable: true })
  issueDate: string | null;

  @Column({ type: 'date', nullable: true })
  expiryDate: string | null;

  @Column({ type: 'date', nullable: true })
  cancellationDate: string | null;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string | null;

  @Column({ type: 'uuid', nullable: true })
  passportId: string | null;

  @ManyToOne(() => WorkerPassportEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'passportId' })
  passport?: WorkerPassportEntity | null;

  @Column({ type: 'uuid', nullable: true })
  supersededById: string | null;

  /** Inverse side — string relation name avoids circular import with attachment entity. */
  @OneToMany('WorkerVisaAttachmentEntity', 'visaRecord')
  attachments?: WorkerVisaAttachmentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
