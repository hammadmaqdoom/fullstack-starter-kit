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

@Entity('company_closures')
@Index('IDX_company_closures_tenant_dates', [
  'tenantId',
  'startDate',
  'endDate',
])
export class CompanyClosureEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  @ManyToOne(() => DivisionEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'divisionId' })
  division?: DivisionEntity | null;

  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
