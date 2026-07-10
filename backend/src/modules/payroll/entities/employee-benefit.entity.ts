import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
import { BenefitTypeEntity } from '@/modules/country-config/entities/benefit-type.entity';
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
import { EmployeeBenefitStatus } from '../enums/payroll.enum';

@Entity('employee_benefits')
@Index('IDX_employee_benefits_tenant_worker', ['tenantId', 'workerId'])
export class EmployeeBenefitEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'uuid' })
  benefitTypeId: string;

  @ManyToOne(() => BenefitTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'benefitTypeId' })
  benefitType?: BenefitTypeEntity;

  @Column({ type: 'jsonb', default: {} })
  fieldValues: Record<string, unknown>;

  @Column({ type: 'date' })
  effectiveFrom: string;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({
    type: 'enum',
    enum: EmployeeBenefitStatus,
    enumName: 'employee_benefit_status_enum',
    default: EmployeeBenefitStatus.DRAFT,
  })
  status: EmployeeBenefitStatus;

  @Column({ type: 'char', length: 3, nullable: true })
  currencyCode: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
