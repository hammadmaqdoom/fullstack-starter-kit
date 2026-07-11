import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { DepartmentEntity } from '@/modules/core-hr/entities/department.entity';
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
import { ManpowerPositionStatus } from '../enums/manpower.enum';
import { ManpowerPlanEntity } from './manpower-plan.entity';

@Entity('manpower_positions')
@Index('IDX_manpower_positions_tenant_plan', ['tenantId', 'planId'])
@Index('IDX_manpower_positions_tenant_status', ['tenantId', 'status'])
export class ManpowerPositionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  planId: string;

  @ManyToOne(() => ManpowerPlanEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'planId' })
  plan?: ManpowerPlanEntity;

  @Column({ type: 'varchar', length: 255 })
  roleTitle: string;

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

  @Column({ type: 'int', default: 1 })
  headcount: number;

  @Column({ type: 'int', default: 0 })
  filledCount: number;

  @Column({
    type: 'enum',
    enum: ManpowerPositionStatus,
    enumName: 'manpower_position_status_enum',
    default: ManpowerPositionStatus.OPEN,
  })
  status: ManpowerPositionStatus;

  @Column({ type: 'uuid', nullable: true })
  requisitionId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
