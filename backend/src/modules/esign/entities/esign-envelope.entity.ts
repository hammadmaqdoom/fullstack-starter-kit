import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import { EsignEnvelopeStatus } from '../enums/esign.enum';
import type { EsignFieldEntity } from './esign-field.entity';
import type { EsignSignatoryEntity } from './esign-signatory.entity';

@Entity('esign_envelopes')
@Index('IDX_esign_envelopes_tenant_status', ['tenantId', 'status'])
export class EsignEnvelopeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: EsignEnvelopeStatus,
    enumName: 'esign_envelope_status_enum',
    default: EsignEnvelopeStatus.DRAFT,
  })
  status: EsignEnvelopeStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  documentBlobUrl: string | null;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId: string | null;

  @Column({ type: 'uuid', nullable: true })
  generatedDocumentId: string | null;

  @Column({ type: 'uuid' })
  createdBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  voidedReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  sealedBlobUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  certificateBlobUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signedCopyBlobUrl: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastReminderAt: Date | null;

  /** Inverse side — string relation name avoids circular import with signatory/field entities. */
  @OneToMany('EsignSignatoryEntity', 'envelope')
  signatories?: EsignSignatoryEntity[];

  @OneToMany('EsignFieldEntity', 'envelope')
  fields?: EsignFieldEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
