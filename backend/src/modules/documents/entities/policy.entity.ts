import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PolicyCategory } from '../enums/policy.enum';
import type { PolicyPopulationRuleEntity } from './policy-population-rule.entity';
import type { PolicyVersionEntity } from './policy-version.entity';

@Entity('policies')
@Index('IDX_policies_tenant_code', ['tenantId', 'code'], { unique: true })
export class PolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({
    type: 'enum',
    enum: PolicyCategory,
    enumName: 'policy_category_enum',
  })
  category: PolicyCategory;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /** Inverse side — string relation name avoids circular import with version/rule entities. */
  @OneToMany('PolicyVersionEntity', 'policy')
  versions?: PolicyVersionEntity[];

  @OneToMany('PolicyPopulationRuleEntity', 'policy')
  populationRules?: PolicyPopulationRuleEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
