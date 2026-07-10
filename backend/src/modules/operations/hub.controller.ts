import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateHubSavedViewDto, QueryHubDto } from './dto/hub.dto';
import { HubService } from './hub.service';

const HUB_ROLES = [
  PolarisRoleCode.EMPLOYEE,
  PolarisRoleCode.CONTRACTOR,
  PolarisRoleCode.MANAGER,
  PolarisRoleCode.PEOPLE_OPS,
  PolarisRoleCode.FINANCE,
  PolarisRoleCode.DIVISION_HEAD,
  PolarisRoleCode.SUPER_ADMIN,
];

@ApiTags('hub')
@Controller({ path: 'hub', version: '1' })
@UseGuards(AuthGuard)
export class HubController {
  constructor(private readonly hubService: HubService) {}

  @Get()
  @Roles(...HUB_ROLES)
  @ApiOperation({ summary: 'Unified Hub inbox — Mine + For me (UX §5.1)' })
  getInbox(
    @Query() query: QueryHubDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.hubService.getInbox(session.user.id, query);
  }

  @Get('views')
  @Roles(...HUB_ROLES)
  @ApiOperation({ summary: 'List Hub saved views' })
  listViews(@CurrentUserSession() session: CurrentUserSession) {
    return this.hubService.listViews(session.user.id);
  }

  @Post('views')
  @Roles(...HUB_ROLES)
  @ApiOperation({ summary: 'Create Hub saved view' })
  createView(
    @Body() dto: CreateHubSavedViewDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.hubService.createView(session.user.id, dto);
  }
}
