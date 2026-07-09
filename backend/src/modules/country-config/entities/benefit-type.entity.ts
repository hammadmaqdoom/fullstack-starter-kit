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
import { BenefitDeliveryMode } from '../enums/setup-wizard.enum';

@Entity('benefit_types')
@Index('IDX_benefit_types_tenant_code', ['tenantId', 'code'], { unique: true })
export class BenefitTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  category: string;

  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @Column({
    type: 'enum',
    enum: BenefitDeliveryMode,
    enumName: 'benefit_delivery_mode_enum',
    default: BenefitDeliveryMode.NON_CASH,
  })
  deliveryMode: BenefitDeliveryMode;

  @Column({ type: 'boolean', default: false })
  affectsPayroll: boolean;

  @Column({ type: 'boolean', default: false })
  affectsTax: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
