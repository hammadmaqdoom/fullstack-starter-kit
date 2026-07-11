import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { DepartmentEntity } from '@/modules/core-hr/entities/department.entity';
import { DivisionEntity } from '@/modules/core-hr/entities/division.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { EmploymentTypeEntity } from '@/modules/country-config/entities/employment-type.entity';
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
import { RequisitionStatus } from '../enums/recruitment.enum';

@Entity('job_requisitions')
@Index('IDX_job_requisitions_tenant_status', ['tenantId', 'status'])
@Index('IDX_job_requisitions_tenant_division', ['tenantId', 'divisionId'])
export class JobRequisitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

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

  @Column({ type: 'uuid' })
  employmentTypeId: string;

  @ManyToOne(() => EmploymentTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employmentTypeId' })
  employmentType?: EmploymentTypeEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'uuid', nullable: true })
  manpowerPositionId: string | null;

  @Column({ type: 'uuid' })
  hiringManagerWorkerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'hiringManagerWorkerId' })
  hiringManager?: WorkerEntity | null;

  @Column({ type: 'int', default: 1 })
  headcount: number;

  @Column({ type: 'int', default: 0 })
  filledCount: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  budgetBandMin: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  budgetBandMax: string | null;

  @Column({ type: 'text', nullable: true })
  justification: string | null;

  @Column({
    type: 'enum',
    enum: RequisitionStatus,
    enumName: 'requisition_status_enum',
    default: RequisitionStatus.DRAFT,
  })
  status: RequisitionStatus;

  @Column({ type: 'uuid' })
  requestedByUserId: string;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  openedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
