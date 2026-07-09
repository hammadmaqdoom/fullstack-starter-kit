import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';

@Entity('country_configs')
@Index('IDX_country_configs_tenant_code', ['tenantId', 'countryCode'], {
  unique: true,
})
export class CountryConfigEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'char', length: 2 })
  countryCode: string;

  @Column({ type: 'jsonb', default: {} })
  configJson: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
