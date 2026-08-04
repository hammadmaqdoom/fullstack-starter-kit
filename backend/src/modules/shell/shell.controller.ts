import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShellSearchQueryDto } from './dto/shell-search-query.dto';
import { ShellSearchService } from './shell-search.service';
import { ShellService } from './shell.service';

@ApiTags('me')
@Controller({ path: 'me', version: '1' })
@UseGuards(AuthGuard)
export class ShellController {
  constructor(
    private readonly shellService: ShellService,
    private readonly shellSearchService: ShellSearchService,
  ) {}

  @Get('shell')
  @ApiOperation({ summary: 'Role-aware shell capabilities for nav + home' })
  async getShell(@CurrentUserSession() session: CurrentUserSession) {
    return this.shellService.getShell(session.user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Role-scoped command palette search' })
  async search(
    @Query() query: ShellSearchQueryDto,
    @CurrentUserSession() session: CurrentUserSession,
  ) {
    return this.shellSearchService.search(
      session.user.id,
      query.q ?? '',
      query.limit ?? 20,
    );
  }
}
