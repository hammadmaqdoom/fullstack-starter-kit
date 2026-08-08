import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { PreBoardingPacketEntity } from './pre-boarding-packet.entity';

@Entity('pre_boarding_field_values')
@Unique('UQ_pre_boarding_field_values_packet_key', [
  'tenantId',
  'packetId',
  'fieldKey',
])
export class PreBoardingFieldValueEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  packetId: string;

  @ManyToOne(() => PreBoardingPacketEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'packetId' })
  packet?: PreBoardingPacketEntity;

  @Column({ type: 'varchar', length: 100 })
  fieldKey: string;

  /** AES-256 ciphertext for sensitive fields (bank/tax); null when valueText used. */
  @Column({ type: 'bytea', nullable: true })
  valueEncrypted: Buffer | null;

  @Column({ type: 'text', nullable: true })
  valueText: string | null;

  @Column({ type: 'uuid', nullable: true })
  attachmentBlobId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
