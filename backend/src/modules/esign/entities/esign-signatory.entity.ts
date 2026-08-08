import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  EsignSignatoryStatus,
  EsignSignatureMethod,
} from '../enums/esign.enum';
import { EsignEnvelopeEntity } from './esign-envelope.entity';

@Entity('esign_signatories')
@Index('IDX_esign_signatories_envelope', ['envelopeId', 'signingOrder'])
export class EsignSignatoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  envelopeId: string;

  @ManyToOne(() => EsignEnvelopeEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'envelopeId' })
  envelope?: EsignEnvelopeEntity;

  @Column({ type: 'uuid', nullable: true })
  workerId: string | null;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'int' })
  signingOrder: number;

  @Column({
    type: 'enum',
    enum: EsignSignatoryStatus,
    enumName: 'esign_signatory_status_enum',
    default: EsignSignatoryStatus.PENDING,
  })
  status: EsignSignatoryStatus;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  signatureBlobUrl: string | null;

  @Column({
    type: 'enum',
    enum: EsignSignatureMethod,
    enumName: 'esign_signature_method_enum',
    nullable: true,
  })
  signatureMethod: EsignSignatureMethod | null;

  /** SHA-256 hex of opaque signing token — never store raw token. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  signingTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  signingTokenExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  signingTokenUsedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
