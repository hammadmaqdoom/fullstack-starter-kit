import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NavigationMenuEntity, MenuLocation } from './entities/navigation-menu.entity';

@Injectable()
export class NavigationService {
  constructor(
    @InjectRepository(NavigationMenuEntity)
    private readonly navigationRepository: Repository<NavigationMenuEntity>,
  ) {}

  async findAll(location?: MenuLocation, locale?: string) {
    const query = this.navigationRepository.createQueryBuilder('menu')
      .where('menu.isActive = :isActive', { isActive: true });

    if (location) {
      query.andWhere('menu.location = :location', { location });
    }

    if (locale) {
      query.andWhere('(menu.locale = :locale OR menu.locale IS NULL)', { locale });
    }

    query.orderBy('menu.order', 'ASC');

    return query.getMany();
  }

  async create(menu: Partial<NavigationMenuEntity>) {
    const newMenu = this.navigationRepository.create(menu);
    return this.navigationRepository.save(newMenu);
  }

  async update(id: string, menu: Partial<NavigationMenuEntity>) {
    await this.navigationRepository.update(id, menu);
    return this.navigationRepository.findOne({ where: { id } });
  }

  async delete(id: string) {
    await this.navigationRepository.softDelete(id);
  }
}

