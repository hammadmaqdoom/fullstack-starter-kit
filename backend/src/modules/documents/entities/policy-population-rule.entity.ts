import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PolicyEntity } from './policy.entity';

@Entity('policy_population_rules')
@Index('IDX_policy_population_rules_policy', ['tenantId', 'policyId'])
export class PolicyPopulationRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  policyId: string;

  @ManyToOne(() => PolicyEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'policyId' })
  policy?: PolicyEntity;

  /** Null = all countries */
  @Column({ type: 'char', length: 2, nullable: true })
  countryCode: string | null;

  /** Null = all divisions */
  @Column({ type: 'uuid', nullable: true })
  divisionId: string | null;

  /** Null = all employment types */
  @Column({ type: 'uuid', nullable: true })
  employmentTypeId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
