import { BaseModel } from '@/database/models/base.model';
import { Column, Entity, Index } from 'typeorm';

export enum MenuLocation {
  HEADER = 'header',
  FOOTER = 'footer',
  SIDEBAR = 'sidebar',
  MOBILE = 'mobile',
}

@Entity('navigation_menus')
export class NavigationMenuEntity extends BaseModel {
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'enum',
    enum: MenuLocation,
  })
  location: MenuLocation;

  @Column({ type: 'jsonb' })
  items: Array<{
    label: string;
    url: string;
    target?: '_blank' | '_self';
    children?: Array<{
      label: string;
      url: string;
      target?: '_blank' | '_self';
    }>;
  }>;

  @Index({ where: '"deletedAt" IS NULL' })
  @Column({ type: 'varchar', length: 10, nullable: true })
  locale?: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;
}

