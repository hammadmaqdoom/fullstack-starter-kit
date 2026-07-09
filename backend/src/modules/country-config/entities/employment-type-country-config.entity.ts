import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { PayrollRoute } from '../enums/country-config.enum';
import { EmploymentTypeEntity } from './employment-type.entity';

@Entity('employment_type_country_configs')
@Index(
  'IDX_etc_configs_tenant_type_country',
  ['tenantId', 'employmentTypeId', 'countryCode'],
  { unique: true },
)
export class EmploymentTypeCountryConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  employmentTypeId: string;

  @ManyToOne(() => EmploymentTypeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employmentTypeId' })
  employmentType?: EmploymentTypeEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'boolean', default: true })
  leaveEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  checkInRequired: boolean;

  @Column({
    type: 'enum',
    enum: PayrollRoute,
    enumName: 'payroll_route_enum',
    default: PayrollRoute.EMPLOYEE_PAY_RUN,
  })
  payrollRoute: PayrollRoute;

  @Column({ type: 'boolean', default: true })
  performanceIncluded: boolean;

  @Column({ type: 'jsonb', default: {} })
  configJson: Record<string, unknown>;
}
