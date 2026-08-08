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
import { PassportSource } from '../enums/onboarding.enum';
import type { WorkerVisaAttachmentEntity } from './worker-visa-attachment.entity';
import type { WorkerVisaRecordEntity } from './worker-visa-record.entity';

@Entity('worker_passports')
@Index('IDX_worker_passports_worker', ['tenantId', 'workerId'])
export class WorkerPassportEntity {
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

  @Column({ type: 'varchar', length: 50 })
  passportNumber: string;

  @Column({ type: 'varchar', length: 2 })
  nationalityCode: string;

  @Column({ type: 'varchar', length: 2 })
  issuingCountryCode: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  placeOfIssue: string | null;

  @Column({ type: 'date' })
  issueDate: string;

  @Column({ type: 'date' })
  expiryDate: string;

  @Column({ type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({
    type: 'enum',
    enum: PassportSource,
    enumName: 'worker_passport_source_enum',
    default: PassportSource.MANUAL,
  })
  source: PassportSource;

  /** Inverse side — string relation name avoids circular import with visa entities. */
  @OneToMany('WorkerVisaRecordEntity', 'passport')
  visaRecords?: WorkerVisaRecordEntity[];

  @OneToMany('WorkerVisaAttachmentEntity', 'passport')
  attachments?: WorkerVisaAttachmentEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
