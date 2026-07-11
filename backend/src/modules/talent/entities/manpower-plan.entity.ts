import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { DivisionEntity } from '@/modules/core-hr/entities/division.entity';
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
import { ManpowerPlanStatus } from '../enums/manpower.enum';

@Entity('manpower_plans')
@Index('IDX_manpower_plans_tenant_year', ['tenantId', 'planYear'])
@Index('IDX_manpower_plans_tenant_division', ['tenantId', 'divisionId'])
export class ManpowerPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  @ManyToOne(() => DivisionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'divisionId' })
  division?: DivisionEntity | null;

  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'int' })
  planYear: number;

  @Column({ type: 'int', default: 0 })
  budgetedFte: number;

  @Column({ type: 'int', default: 0 })
  budgetedContractorCapacity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  plannedAttritionPercent: string;

  @Column({
    type: 'enum',
    enum: ManpowerPlanStatus,
    enumName: 'manpower_plan_status_enum',
    default: ManpowerPlanStatus.DRAFT,
  })
  status: ManpowerPlanStatus;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
