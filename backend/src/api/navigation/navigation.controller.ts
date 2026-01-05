import { AuthGuard } from '@/auth/auth.guard';
import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { NavigationService } from './navigation.service';
import { MenuLocation } from './entities/navigation-menu.entity';

@ApiTags('navigation')
@Controller({
  path: 'navigation',
  version: '1',
})
@UseGuards(AuthGuard)
export class NavigationController {
  constructor(private readonly navigationService: NavigationService) {}

  @Get()
  @PublicAuth()
  @ApiAuth({
    summary: 'Get navigation menus (public)',
  })
  @ApiQuery({ name: 'location', required: false, enum: MenuLocation })
  @ApiQuery({ name: 'locale', required: false, type: String })
  async findAll(
    @Query('location') location?: MenuLocation,
    @Query('locale') locale?: string,
  ) {
    return this.navigationService.findAll(location, locale);
  }

  @Post()
  @ApiAuth({
    summary: 'Create navigation menu (admin only)',
  })
  async create(@Query() menu: any) {
    return this.navigationService.create(menu);
  }

  @Patch(':id')
  @ApiAuth({
    summary: 'Update navigation menu (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Query() menu: any) {
    return this.navigationService.update(id, menu);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete navigation menu (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.navigationService.delete(id);
  }
}

