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

@Entity('office_locations')
@Index('IDX_office_locations_tenant_country', ['tenantId', 'countryCode'])
export class OfficeLocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: string;

  @Column({ type: 'int', default: 200 })
  geofenceRadiusM: number;

  @Column({ type: 'inet', array: true, nullable: true })
  ipAllowlist: string[] | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
