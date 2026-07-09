import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import {
  ApplySetupWizardSeedDto,
  SaveSetupWizardStepDto,
} from './dto/setup-wizard.dto';
import { SetupWizardService } from './setup-wizard.service';

@ApiTags('admin')
@Controller({ path: 'admin/setup-wizard', version: '1' })
@UseGuards(AuthGuard)
export class SetupWizardController {
  constructor(private readonly setupWizardService: SetupWizardService) {}

  @Get()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get guided setup wizard state' })
  async getState() {
    return this.setupWizardService.getState();
  }

  @Post()
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Save or skip a setup wizard step' })
  async saveStep(
    @Body() dto: SaveSetupWizardStepDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.setupWizardService.saveStep(
      dto,
      session.user.id,
      undefined,
      correlationId,
      request?.ip,
    );
  }

  @Post('seed')
  @Roles(PolarisRoleCode.PEOPLE_OPS, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Apply PK/UAE/SG setup seeds' })
  async applySeeds(
    @Body() dto: ApplySetupWizardSeedDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: FastifyRequest,
  ) {
    return this.setupWizardService.applySeeds(
      session.user.id,
      undefined,
      correlationId,
      request?.ip,
      dto.countryCodes,
    );
  }
}
