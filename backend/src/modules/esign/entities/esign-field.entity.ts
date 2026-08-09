import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EsignFieldType } from '../enums/esign.enum';
import { EsignEnvelopeEntity } from './esign-envelope.entity';
import { EsignSignatoryEntity } from './esign-signatory.entity';

@Entity('esign_fields')
@Index('IDX_esign_fields_envelope', ['envelopeId'])
export class EsignFieldEntity {
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

  @Column({ type: 'uuid' })
  signatoryId: string;

  @ManyToOne(() => EsignSignatoryEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'signatoryId' })
  signatory?: EsignSignatoryEntity;

  @Column({
    type: 'enum',
    enum: EsignFieldType,
    enumName: 'esign_field_type_enum',
  })
  fieldType: EsignFieldType;

  @Column({ type: 'int' })
  page: number;

  @Column({ type: 'float' })
  x: number;

  @Column({ type: 'float' })
  y: number;

  @Column({ type: 'float' })
  width: number;

  @Column({ type: 'float' })
  height: number;

  @Column({ type: 'text', nullable: true })
  value: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
