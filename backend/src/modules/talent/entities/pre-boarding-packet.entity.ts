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
import { PreBoardingPacketStatus } from '../enums/onboarding.enum';
import type { PreBoardingFieldValueEntity } from './pre-boarding-field-value.entity';

@Entity('pre_boarding_packets')
@Index('IDX_pre_boarding_packets_tenant_status', ['tenantId', 'status'])
@Index('IDX_pre_boarding_packets_worker', ['tenantId', 'workerId'])
export class PreBoardingPacketEntity {
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

  @Column({ type: 'uuid', nullable: true })
  candidateId: string | null;

  @Column({ type: 'varchar', length: 255 })
  personalEmail: string;

  @Column({
    type: 'enum',
    enum: PreBoardingPacketStatus,
    enumName: 'pre_boarding_packet_status_enum',
    default: PreBoardingPacketStatus.DRAFT,
  })
  status: PreBoardingPacketStatus;

  @Column({ type: 'timestamptz', nullable: true })
  consentAt: Date | null;

  @Column({ type: 'inet', nullable: true })
  consentIp: string | null;

  @Column({ type: 'uuid', nullable: true })
  templateVersionId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  mergedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  correlationId: string | null;

  /** SHA-256 hash of the candidate magic-link/session token — never store the raw token. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  accessTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  accessTokenExpiresAt: Date | null;

  /** Inverse side — string relation name avoids circular import with field-value entity. */
  @OneToMany('PreBoardingFieldValueEntity', 'packet')
  fieldValues?: PreBoardingFieldValueEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
