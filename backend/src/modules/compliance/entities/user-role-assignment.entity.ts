import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '@/auth/entities/user.entity';
import { ScopeType } from '../enums/scope-type.enum';
import { RoleEntity } from './role.entity';
import { TenantEntity } from './tenant.entity';

@Entity('user_role_assignments')
@Index('IDX_user_roles_tenant_user_effective', [
  'tenantId',
  'userId',
  'effectiveFrom',
])
export class UserRoleAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({ type: 'uuid' })
  roleId: string;

  @ManyToOne(() => RoleEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'roleId' })
  role?: RoleEntity;

  @Column({
    type: 'enum',
    enum: ScopeType,
    default: ScopeType.OWN,
  })
  scopeType: ScopeType;

  @Column({ type: 'uuid', nullable: true })
  scopeId: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ type: 'uuid', nullable: true })
  assignedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
