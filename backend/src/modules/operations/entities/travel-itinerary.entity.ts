import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TravelRequestEntity } from './travel-request.entity';

@Entity('travel_itineraries')
@Index('IDX_travel_itineraries_tenant_request', ['tenantId', 'travelRequestId'])
export class TravelItineraryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  tenantId: string;

  @Column({ type: 'uuid' })
  travelRequestId: string;

  @ManyToOne(() => TravelRequestEntity, (request) => request.itineraries, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'travelRequestId' })
  travelRequest?: TravelRequestEntity;

  /** Free-text leg type — flight, hotel, transport (PRD §6.17.1). */
  @Column({ type: 'varchar', length: 50 })
  legType: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'timestamptz', nullable: true })
  departureAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  arrivalAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
