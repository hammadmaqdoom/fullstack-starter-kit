import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Environment, AnalyticsPlatform } from './entities/analytics-config.entity';
import { VerificationPlatform } from './entities/site-verification.entity';
import { ScriptPosition } from './entities/custom-script.entity';
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsConfigDto } from './dto/create-analytics-config.dto';
import { UpdateAnalyticsConfigDto } from './dto/update-analytics-config.dto';
import { CreateSiteVerificationDto } from './dto/create-site-verification.dto';
import { CreateCustomScriptDto } from './dto/create-custom-script.dto';
import { CreateFeatureFlagDto } from './dto/create-feature-flag.dto';

@ApiTags('analytics')
@Controller({
  path: 'analytics',
  version: '1',
})
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // Analytics Configs - Public read, Admin write
  @Get('configs')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get all analytics configs (public)',
  })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'environment', required: false, enum: Environment })
  async getAnalyticsConfigs(
    @Query('activeOnly') activeOnly?: string,
    @Query('environment') environment?: Environment,
  ) {
    return this.analyticsService.findAllAnalyticsConfigs(
      activeOnly === 'true',
      environment,
    );
  }

  @Get('configs/:id')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get analytics config by id',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async getAnalyticsConfigById(@Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.findAnalyticsConfigById(id);
  }

  @Post('configs')
  @ApiAuth({
    summary: 'Create analytics config (admin only)',
  })
  async createAnalyticsConfig(
    @Body() dto: CreateAnalyticsConfigDto,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    return this.analyticsService.createAnalyticsConfig(dto, user.id);
  }

  @Patch('configs/:id')
  @ApiAuth({
    summary: 'Update analytics config (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async updateAnalyticsConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnalyticsConfigDto,
  ) {
    return this.analyticsService.updateAnalyticsConfig(id, dto);
  }

  @Delete('configs/:id')
  @ApiAuth({
    summary: 'Delete analytics config (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async deleteAnalyticsConfig(@Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.deleteAnalyticsConfig(id);
  }

  // Site Verification - Public read, Admin write
  @Get('verification')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get all verification codes (public)',
  })
  async getVerifications() {
    return this.analyticsService.findAllVerifications();
  }

  @Get('verification/:platform')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get verification by platform',
  })
  @ApiParam({ name: 'platform', enum: VerificationPlatform })
  async getVerificationByPlatform(
    @Param('platform') platform: VerificationPlatform,
  ) {
    return this.analyticsService.findVerificationByPlatform(platform);
  }

  @Post('verification')
  @ApiAuth({
    summary: 'Create or update verification (admin only)',
  })
  async createVerification(@Body() dto: CreateSiteVerificationDto) {
    return this.analyticsService.createVerification(dto);
  }

  @Patch('verification/:id')
  @ApiAuth({
    summary: 'Update verification (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async updateVerification(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateSiteVerificationDto>,
  ) {
    return this.analyticsService.updateVerification(id, dto);
  }

  @Post('verification/:platform/verify')
  @ApiAuth({
    summary: 'Mark verification as verified (admin only)',
  })
  @ApiParam({ name: 'platform', enum: VerificationPlatform })
  async verifyPlatform(@Param('platform') platform: VerificationPlatform) {
    return this.analyticsService.markVerificationAsVerified(platform);
  }

  // Custom Scripts - Public read, Admin write
  @Get('custom-scripts')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get all custom scripts (public)',
  })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'position', required: false, enum: ScriptPosition })
  @ApiQuery({ name: 'environment', required: false, enum: Environment })
  async getCustomScripts(
    @Query('activeOnly') activeOnly?: string,
    @Query('position') position?: ScriptPosition,
    @Query('environment') environment?: Environment,
  ) {
    return this.analyticsService.findAllCustomScripts(
      activeOnly === 'true',
      position,
      environment,
    );
  }

  @Get('custom-scripts/:id')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get custom script by id',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async getCustomScriptById(@Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.findCustomScriptById(id);
  }

  @Post('custom-scripts')
  @ApiAuth({
    summary: 'Create custom script (admin only)',
  })
  async createCustomScript(
    @Body() dto: CreateCustomScriptDto,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ) {
    return this.analyticsService.createCustomScript(dto, user.id);
  }

  @Patch('custom-scripts/:id')
  @ApiAuth({
    summary: 'Update custom script (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async updateCustomScript(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateCustomScriptDto>,
  ) {
    return this.analyticsService.updateCustomScript(id, dto);
  }

  @Delete('custom-scripts/:id')
  @ApiAuth({
    summary: 'Delete custom script (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async deleteCustomScript(@Param('id', ParseUUIDPipe) id: string) {
    return this.analyticsService.deleteCustomScript(id);
  }

  // Feature Flags - Public read, Admin write
  @Get('feature-flags')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get all feature flags (public)',
  })
  @ApiQuery({ name: 'environment', required: false, enum: Environment })
  async getFeatureFlags(@Query('environment') environment?: Environment) {
    return this.analyticsService.findAllFeatureFlags(environment);
  }

  @Get('feature-flags/:flagName')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get feature flag by name',
  })
  @ApiParam({ name: 'flagName', type: 'string' })
  @ApiQuery({ name: 'environment', required: false, enum: Environment })
  async getFeatureFlagByName(
    @Param('flagName') flagName: string,
    @Query('environment') environment?: Environment,
  ) {
    return this.analyticsService.findFeatureFlagByName(flagName, environment);
  }

  @Post('feature-flags')
  @ApiAuth({
    summary: 'Create feature flag (admin only)',
  })
  async createFeatureFlag(@Body() dto: CreateFeatureFlagDto) {
    return this.analyticsService.createFeatureFlag(dto);
  }

  @Patch('feature-flags/:id')
  @ApiAuth({
    summary: 'Update feature flag (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async updateFeatureFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateFeatureFlagDto>,
  ) {
    return this.analyticsService.updateFeatureFlag(id, dto);
  }

  @Patch('feature-flags/:flagName/toggle')
  @ApiAuth({
    summary: 'Toggle feature flag (admin only)',
  })
  @ApiParam({ name: 'flagName', type: 'string' })
  @ApiQuery({ name: 'isEnabled', required: true, type: Boolean })
  @ApiQuery({ name: 'environment', required: false, enum: Environment })
  async toggleFeatureFlag(
    @Param('flagName') flagName: string,
    @Query('isEnabled') isEnabled: string,
    @Query('environment') environment?: Environment,
  ) {
    return this.analyticsService.toggleFeatureFlag(
      flagName,
      isEnabled === 'true',
      environment,
    );
  }
}

