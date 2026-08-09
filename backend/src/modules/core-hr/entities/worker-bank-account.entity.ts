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
import { WorkerEntity } from './worker.entity';

@Entity('worker_bank_accounts')
@Index('IDX_worker_bank_accounts_worker', ['tenantId', 'workerId'])
export class WorkerBankAccountEntity {
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

  @Column({ type: 'varchar', length: 255 })
  bankName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  accountHolderName: string | null;

  @Column({ type: 'bytea' })
  accountNumberEncrypted: Buffer;

  @Column({ type: 'bytea', nullable: true })
  ibanEncrypted: Buffer | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  swiftBic: string | null;

  @Column({ type: 'char', length: 2 })
  bankCountryCode: string;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
