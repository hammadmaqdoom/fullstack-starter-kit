import { TenantEntity } from '@/modules/compliance/entities/tenant.entity';
import { WorkerEntity } from '@/modules/core-hr/entities/worker.entity';
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
import { TravelRequestStatus, TravelType } from '../enums/travel.enum';
import { TravelItineraryEntity } from './travel-itinerary.entity';

@Entity('travel_requests')
@Index('IDX_travel_requests_tenant_worker_status', [
  'tenantId',
  'workerId',
  'status',
])
export class TravelRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenantId' })
  tenant?: TenantEntity;

  @Column({ type: 'uuid' })
  workerId: string;

  @ManyToOne(() => WorkerEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workerId' })
  worker?: WorkerEntity;

  @Column({ type: 'jsonb' })
  destinations: string[];

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date' })
  endDate: string;

  @Column({ type: 'text' })
  purpose: string;

  @Column({
    type: 'enum',
    enum: TravelType,
    enumName: 'travel_type_enum',
  })
  travelType: TravelType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  estimatedCost: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  actualCost: string | null;

  @Column({ type: 'char', length: 3 })
  currencyCode: string;

  @Column({
    type: 'enum',
    enum: TravelRequestStatus,
    enumName: 'travel_request_status_enum',
    default: TravelRequestStatus.DRAFT,
  })
  status: TravelRequestStatus;

  @Column({ type: 'uuid', nullable: true })
  managerApprovedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  managerApprovedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  financeApprovedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  financeApprovedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  peopleOpsApprovedBy: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  peopleOpsApprovedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @OneToMany(() => TravelItineraryEntity, (leg) => leg.travelRequest)
  itineraries?: TravelItineraryEntity[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
