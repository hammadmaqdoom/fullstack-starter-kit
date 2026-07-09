import { AuthGuard } from '@/auth/auth.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { POLARIS_AUTH_CONTEXT_KEY } from '@/constants/rbac.constant';
import { PolarisRoleCode } from '@/modules/compliance/enums/polaris-role-code.enum';
import { PolarisAuthContext } from '@/modules/compliance/types/rbac.type';
import {
  Body,
  Controller,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { RejectProfileChangeRequestDto } from './dto/profile-change-request.dto';
import { ProfileChangeRequestService } from './profile-change-request.service';

type ChangeRequestHttpRequest = FastifyRequest & {
  [POLARIS_AUTH_CONTEXT_KEY]?: PolarisAuthContext;
};

@ApiTags('change-requests')
@Controller({ path: 'change-requests', version: '1' })
@UseGuards(AuthGuard)
export class ProfileChangeRequestController {
  constructor(
    private readonly profileChangeRequestService: ProfileChangeRequestService,
  ) {}

  @Post(':id/approve')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
  )
  @ApiOperation({ summary: 'Approve profile change request' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: ChangeRequestHttpRequest,
  ) {
    return this.profileChangeRequestService.approve(
      id,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }

  @Post(':id/reject')
  @Roles(
    PolarisRoleCode.PEOPLE_OPS,
    PolarisRoleCode.SUPER_ADMIN,
    PolarisRoleCode.MANAGER,
  )
  @ApiOperation({ summary: 'Reject profile change request with reason' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectProfileChangeRequestDto,
    @CurrentUserSession() session: CurrentUserSession,
    @Headers('x-correlation-id') correlationId?: string,
    @Req() request?: ChangeRequestHttpRequest,
  ) {
    return this.profileChangeRequestService.reject(
      id,
      dto.reason,
      session.user.id,
      correlationId,
      request?.ip,
    );
  }
}
