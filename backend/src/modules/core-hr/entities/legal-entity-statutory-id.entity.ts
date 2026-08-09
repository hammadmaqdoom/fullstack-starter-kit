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
import { LegalEntityEntity } from './legal-entity.entity';

@Entity('legal_entity_statutory_ids')
@Index('IDX_legal_entity_statutory_ids_unique', ['tenantId', 'legalEntityId', 'fieldKey'], {
  unique: true,
})
@Index('IDX_legal_entity_statutory_ids_entity', ['tenantId', 'legalEntityId'])
export class LegalEntityStatutoryIdEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  legalEntityId: string;

  @ManyToOne(() => LegalEntityEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'legalEntityId' })
  legalEntity?: LegalEntityEntity;

  /** Country-config key e.g. ntn, secp_registration, trade_licence_number, uen. */
  @Column({ type: 'varchar', length: 50 })
  fieldKey: string;

  @Column({ type: 'varchar', length: 255 })
  fieldValue: string;

  @Column({ type: 'date', nullable: true })
  expiryDate: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
