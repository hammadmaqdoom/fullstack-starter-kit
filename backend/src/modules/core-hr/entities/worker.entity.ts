import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { EmploymentTypeEntity } from '@/modules/country-config/entities/employment-type.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DepartmentEntity } from './department.entity';
import { DivisionEntity } from './division.entity';
import {
  EntraStatus,
  WorkMode,
  WorkerStatus,
} from '../enums/worker.enum';

export interface CompensationBand {
  currency: string;
  baseSalary: number;
  payFrequency: 'monthly' | 'weekly';
}

@Entity('workers')
@Index('IDX_workers_tenant_email', ['tenantId', 'email'], { unique: true })
@Index('IDX_workers_tenant_employee_number', ['tenantId', 'employeeNumber'], {
  unique: true,
})
@Index('IDX_workers_status', ['tenantId', 'status', 'countryCode'])
@Index('IDX_workers_entity', ['tenantId', 'legalEntityId'])
@Index('IDX_workers_manager', ['tenantId', 'managerId'])
export class WorkerEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid', nullable: true })
  legalEntityId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'uuid' })
  employmentTypeId: string;

  @ManyToOne(() => EmploymentTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employmentTypeId' })
  employmentType?: EmploymentTypeEntity;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  @ManyToOne(() => DivisionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'divisionId' })
  division?: DivisionEntity | null;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => DepartmentEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'departmentId' })
  department?: DepartmentEntity | null;

  @Column({ type: 'uuid', nullable: true })
  managerId: string | null;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'char', length: 2 })
  bankCountryCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  personalEmail: string | null;

  @Column({
    type: 'enum',
    enum: WorkMode,
    enumName: 'work_mode_enum',
    nullable: true,
  })
  workMode: WorkMode | null;

  @Column({
    type: 'enum',
    enum: WorkerStatus,
    enumName: 'worker_status_enum',
    default: WorkerStatus.DRAFT,
  })
  status: WorkerStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  employeeNumber: string | null;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: EntraStatus,
    enumName: 'entra_status_enum',
    default: EntraStatus.NOT_REQUIRED,
  })
  entraStatus: EntraStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entraObjectId: string | null;

  @Column({ type: 'date', nullable: true })
  probationEndDate: string | null;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string | null;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1 })
  fteFraction: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone: string | null;

  @Column({ type: 'jsonb', default: {} })
  statutoryFields: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true })
  compensationBand: CompensationBand | null;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
