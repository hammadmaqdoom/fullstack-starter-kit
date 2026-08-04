import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShellService } from './shell.service';

@ApiTags('me')
@Controller({ path: 'me', version: '1' })
@UseGuards(AuthGuard)
export class ShellController {
  constructor(private readonly shellService: ShellService) {}

  @Get('shell')
  @ApiOperation({ summary: 'Role-aware shell capabilities for nav + home' })
  async getShell(@CurrentUserSession() session: CurrentUserSession) {
    return this.shellService.getShell(session.user.id);
  }
}
