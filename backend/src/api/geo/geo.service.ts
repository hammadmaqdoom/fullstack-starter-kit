import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeoSettingEntity } from './entities/geo-setting.entity';

@Injectable()
export class GeoService {
  constructor(
    @InjectRepository(GeoSettingEntity)
    private readonly geoRepository: Repository<GeoSettingEntity>,
  ) {}

  async findAll() {
    return this.geoRepository.find({
      order: { countryCode: 'ASC', languageCode: 'ASC' },
    });
  }

  async findByLocale(locale: string) {
    const [languageCode, countryCode] = locale.split('-');
    return this.geoRepository.findOne({
      where: { languageCode, countryCode: countryCode || languageCode },
    });
  }

  async getHreflangTags(contentId: string) {
    // This would generate hreflang tags for a content piece
    // Implementation would fetch all locales and generate alternate links
    return [];
  }

  async create(setting: Partial<GeoSettingEntity>) {
    const newSetting = this.geoRepository.create(setting);
    return this.geoRepository.save(newSetting);
  }

  async update(id: string, setting: Partial<GeoSettingEntity>) {
    await this.geoRepository.update(id, setting);
    return this.geoRepository.findOne({ where: { id } });
  }
}

