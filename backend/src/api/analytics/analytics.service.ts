import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsConfigEntity, Environment } from './entities/analytics-config.entity';
import { SiteVerificationEntity, VerificationPlatform } from './entities/site-verification.entity';
import { CustomScriptEntity, ScriptPosition } from './entities/custom-script.entity';
import { FeatureFlagEntity } from './entities/feature-flag.entity';
import { CreateAnalyticsConfigDto } from './dto/create-analytics-config.dto';
import { UpdateAnalyticsConfigDto } from './dto/update-analytics-config.dto';
import { CreateSiteVerificationDto } from './dto/create-site-verification.dto';
import { CreateCustomScriptDto } from './dto/create-custom-script.dto';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsConfigEntity)
    private readonly analyticsConfigRepository: Repository<AnalyticsConfigEntity>,
    @InjectRepository(SiteVerificationEntity)
    private readonly siteVerificationRepository: Repository<SiteVerificationEntity>,
    @InjectRepository(CustomScriptEntity)
    private readonly customScriptRepository: Repository<CustomScriptEntity>,
    @InjectRepository(FeatureFlagEntity)
    private readonly featureFlagRepository: Repository<FeatureFlagEntity>,
  ) {}

  // Analytics Configs
  async findAllAnalyticsConfigs(activeOnly = false, environment?: Environment) {
    const query = this.analyticsConfigRepository.createQueryBuilder('config');
    
    if (activeOnly) {
      query.where('config.isActive = :isActive', { isActive: true });
    }
    
    if (environment) {
      query.andWhere('(config.environment = :env OR config.environment = :all)', {
        env: environment,
        all: Environment.ALL,
      });
    }
    
    query.orderBy('config.priority', 'ASC');
    
    return query.getMany();
  }

  async findAnalyticsConfigById(id: string) {
    const config = await this.analyticsConfigRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('Analytics config not found');
    }
    return config;
  }

  async createAnalyticsConfig(dto: CreateAnalyticsConfigDto, userId?: string) {
    const config = this.analyticsConfigRepository.create({
      ...dto,
      createdByUserId: userId,
    });
    return this.analyticsConfigRepository.save(config);
  }

  async updateAnalyticsConfig(id: string, dto: UpdateAnalyticsConfigDto) {
    await this.findAnalyticsConfigById(id);
    await this.analyticsConfigRepository.update(id, dto);
    return this.findAnalyticsConfigById(id);
  }

  async deleteAnalyticsConfig(id: string) {
    await this.findAnalyticsConfigById(id);
    await this.analyticsConfigRepository.softDelete(id);
  }

  // Site Verification
  async findAllVerifications() {
    return this.siteVerificationRepository.find({
      order: { platform: 'ASC' },
    });
  }

  async findVerificationByPlatform(platform: VerificationPlatform) {
    return this.siteVerificationRepository.findOne({ where: { platform } });
  }

  async createVerification(dto: CreateSiteVerificationDto) {
    const existing = await this.findVerificationByPlatform(dto.platform);
    if (existing) {
      await this.siteVerificationRepository.update(existing.id, dto);
      return this.findVerificationByPlatform(dto.platform);
    }
    const verification = this.siteVerificationRepository.create(dto);
    return this.siteVerificationRepository.save(verification);
  }

  async updateVerification(id: string, dto: Partial<CreateSiteVerificationDto>) {
    await this.siteVerificationRepository.findOneOrFail({ where: { id } });
    await this.siteVerificationRepository.update(id, dto);
    return this.siteVerificationRepository.findOne({ where: { id } });
  }

  async markVerificationAsVerified(platform: VerificationPlatform) {
    const verification = await this.findVerificationByPlatform(platform);
    if (verification) {
      verification.isVerified = true;
      verification.verifiedAt = new Date();
      verification.lastChecked = new Date();
      return this.siteVerificationRepository.save(verification);
    }
    throw new NotFoundException('Verification not found');
  }

  // Custom Scripts
  async findAllCustomScripts(activeOnly = false, position?: ScriptPosition, environment?: Environment) {
    const query = this.customScriptRepository.createQueryBuilder('script');
    
    if (activeOnly) {
      query.where('script.isActive = :isActive', { isActive: true });
    }
    
    if (position) {
      query.andWhere('script.position = :position', { position });
    }
    
    if (environment) {
      query.andWhere('(script.environment = :env OR script.environment = :all)', {
        env: environment,
        all: Environment.ALL,
      });
    }
    
    query.orderBy('script.priority', 'ASC');
    
    return query.getMany();
  }

  async findCustomScriptById(id: string) {
    const script = await this.customScriptRepository.findOne({ where: { id } });
    if (!script) {
      throw new NotFoundException('Custom script not found');
    }
    return script;
  }

  async createCustomScript(dto: CreateCustomScriptDto, userId?: string) {
    const script = this.customScriptRepository.create({
      ...dto,
      createdByUserId: userId,
    });
    return this.customScriptRepository.save(script);
  }

  async updateCustomScript(id: string, dto: Partial<CreateCustomScriptDto>) {
    await this.findCustomScriptById(id);
    await this.customScriptRepository.update(id, dto);
    return this.findCustomScriptById(id);
  }

  async deleteCustomScript(id: string) {
    await this.findCustomScriptById(id);
    await this.customScriptRepository.softDelete(id);
  }

  // Feature Flags
  async findAllFeatureFlags(environment?: Environment) {
    const query = this.featureFlagRepository.createQueryBuilder('flag');
    
    if (environment) {
      query.where('(flag.environment = :env OR flag.environment = :all)', {
        env: environment,
        all: Environment.ALL,
      });
    }
    
    return query.getMany();
  }

  async findFeatureFlagByName(flagName: string, environment?: Environment) {
    const query = this.featureFlagRepository.createQueryBuilder('flag')
      .where('flag.flagName = :flagName', { flagName });
    
    if (environment) {
      query.andWhere('(flag.environment = :env OR flag.environment = :all)', {
        env: environment,
        all: Environment.ALL,
      });
    }
    
    return query.getOne();
  }

  async createFeatureFlag(dto: CreateFeatureFlagDto) {
    const flag = this.featureFlagRepository.create(dto);
    return this.featureFlagRepository.save(flag);
  }

  async updateFeatureFlag(id: string, dto: Partial<CreateFeatureFlagDto>) {
    await this.featureFlagRepository.findOneOrFail({ where: { id } });
    await this.featureFlagRepository.update(id, dto);
    return this.featureFlagRepository.findOne({ where: { id } });
  }

  async toggleFeatureFlag(flagName: string, isEnabled: boolean, environment?: Environment) {
    const flag = await this.findFeatureFlagByName(flagName, environment);
    if (flag) {
      flag.isEnabled = isEnabled;
      return this.featureFlagRepository.save(flag);
    }
    throw new NotFoundException('Feature flag not found');
  }
}

