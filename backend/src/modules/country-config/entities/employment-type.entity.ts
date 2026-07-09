import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';

@Entity('employment_types')
@Index('IDX_employment_types_tenant_code', ['tenantId', 'code'], {
  unique: true,
})
export class EmploymentTypeEntity {
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
  displayName: string;

  @Column({ type: 'boolean', default: true })
  isFte: boolean;
}
