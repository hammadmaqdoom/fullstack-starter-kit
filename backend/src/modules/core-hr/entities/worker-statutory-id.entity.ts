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

@Entity('worker_statutory_ids')
@Index('IDX_worker_statutory_ids_unique', ['tenantId', 'workerId', 'fieldKey'], {
  unique: true,
})
@Index('IDX_worker_statutory_ids_worker', ['tenantId', 'workerId'])
export class WorkerStatutoryIdEntity {
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

  @Column({ type: 'char', length: 2 })
  countryCode: string;

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
