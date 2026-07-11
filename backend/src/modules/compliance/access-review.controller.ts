import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessReviewService } from './access-review.service';
import {
  OpenAccessReviewCycleDto,
  ReviewAccessReviewItemDto,
} from './dto/access-review.dto';
import { PolarisRoleCode } from './enums/polaris-role-code.enum';

@ApiTags('compliance')
@Controller({ path: 'compliance/access-reviews', version: '1' })
@UseGuards(AuthGuard)
export class AccessReviewController {
  constructor(private readonly accessReviewService: AccessReviewService) {}

  @Post()
  @Roles(PolarisRoleCode.IT_ADMIN, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Open a quarterly access review cycle (snapshots active role assignments)' })
  async open(
    @Body() dto: OpenAccessReviewCycleDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.accessReviewService.openCycle(dto, session.user.id);
  }

  @Get()
  @Roles(
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List access review cycles' })
  async list() {
    return this.accessReviewService.listCycles();
  }

  @Get(':id')
  @Roles(
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get an access review cycle' })
  async getCycle(@Param('id', ParseUUIDPipe) id: string) {
    return this.accessReviewService.getCycle(id);
  }

  @Get(':id/items')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List review items scoped to the caller (manager sees own reports; admins see all)' })
  async listItems(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.accessReviewService.listItems(id, session.user.id);
  }

  @Patch('items/:itemId/certify')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Certify that access remains required for a reviewed assignment' })
  async certify(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ReviewAccessReviewItemDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.accessReviewService.certifyItem(
      itemId,
      session.user.id,
      dto.notes,
    );
  }

  @Patch('items/:itemId/revoke')
  @Roles(
    PolarisRoleCode.MANAGER,
    PolarisRoleCode.IT_ADMIN,
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Revoke unjustified access found during review (also ends the role assignment)' })
  async revoke(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ReviewAccessReviewItemDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.accessReviewService.revokeItem(
      itemId,
      session.user.id,
      dto.notes,
    );
  }

  @Post(':id/complete')
  @Roles(PolarisRoleCode.IT_ADMIN, PolarisRoleCode.SUPER_ADMIN)
  @ApiOperation({ summary: 'Close an access review cycle and file the review record' })
  async complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.accessReviewService.completeCycle(id, session.user.id);
  }
}
