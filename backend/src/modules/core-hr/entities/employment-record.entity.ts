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
import { DepartmentEntity } from './department.entity';
import { DivisionEntity } from './division.entity';
import { WorkerEntity } from './worker.entity';

export enum EmploymentRecordChangeType {
  HIRE = 'hire',
  PROMOTION = 'promotion',
  TRANSFER = 'transfer',
  TITLE_CHANGE = 'title_change',
  COMPENSATION_REVISION = 'compensation_revision',
  OTHER = 'other',
}

@Entity('employment_records')
@Index('IDX_employment_records_worker', ['tenantId', 'workerId', 'effectiveFrom'])
export class EmploymentRecordEntity {
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

  @Column({ type: 'varchar', length: 150 })
  title: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => DepartmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department?: DepartmentEntity | null;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  @ManyToOne(() => DivisionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'divisionId' })
  division?: DivisionEntity | null;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({
    type: 'enum',
    enum: EmploymentRecordChangeType,
    enumName: 'employment_record_change_type_enum',
    default: EmploymentRecordChangeType.OTHER,
  })
  changeType: EmploymentRecordChangeType;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  sourceDocumentId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
