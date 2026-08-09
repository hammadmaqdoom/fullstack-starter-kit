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
import { WorkerEntity } from './worker.entity';

export enum SkillVisibility {
  PRIVATE = 'private',
  MANAGER = 'manager',
  DIRECTORY = 'directory',
}

@Entity('employee_skills')
@Index('IDX_employee_skills_unique', ['tenantId', 'workerId', 'skillName'], {
  unique: true,
})
export class EmployeeSkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'varchar', length: 100 })
  skillName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  proficiency: string | null;

  @Column({
    type: 'enum',
    enum: SkillVisibility,
    enumName: 'skill_visibility_enum',
    default: SkillVisibility.MANAGER,
  })
  visibility: SkillVisibility;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
