import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
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
import { BenefitTypeFieldType } from '../enums/payroll.enum';

@Entity('benefit_type_fields')
@Index('IDX_benefit_type_fields_type_code', ['benefitTypeId', 'fieldCode'], {
  unique: true,
})
export class BenefitTypeFieldEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  benefitTypeId: string;

  @ManyToOne(() => BenefitTypeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'benefitTypeId' })
  benefitType?: BenefitTypeEntity;

  @Column({ type: 'varchar', length: 50 })
  fieldCode: string;

  @Column({ type: 'varchar', length: 100 })
  label: string;

  @Column({
    type: 'enum',
    enum: BenefitTypeFieldType,
    enumName: 'benefit_type_field_type_enum',
  })
  fieldType: BenefitTypeFieldType;

  @Column({ type: 'boolean', default: false })
  required: boolean;

  @Column({ type: 'boolean', default: false })
  employeeVisible: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'jsonb', nullable: true })
  validationRules: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
