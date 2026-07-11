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
import { LeaveAccrualMethod } from '../enums/setup-wizard.enum';

@Entity('leave_types')
@Index('IDX_leave_types_tenant_country_code', ['tenantId', 'countryCode', 'code'], {
  unique: true,
})
export class LeaveTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: LeaveAccrualMethod,
    enumName: 'leave_accrual_method_enum',
    default: LeaveAccrualMethod.ANNUAL,
  })
  accrualMethod: LeaveAccrualMethod;

  /** Country-default annual allotment (days). Employment-type overrides via configJson.leaveEntitlements. */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  daysPerYear: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  carryForwardCap: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
