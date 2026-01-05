import { AuthGuard } from '@/auth/auth.guard';
import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GeoService } from './geo.service';

@ApiTags('geo')
@Controller({
  path: 'geo',
  version: '1',
})
@UseGuards(AuthGuard)
export class GeoController {
  constructor(private readonly geoService: GeoService) {}

  @Get('settings')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get all geo settings (public)',
  })
  async findAll() {
    return this.geoService.findAll();
  }

  @Get('settings/:locale')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get geo settings by locale',
  })
  @ApiParam({ name: 'locale', type: 'string' })
  async findByLocale(@Param('locale') locale: string) {
    return this.geoService.findByLocale(locale);
  }

  @Get('hreflang/:contentId')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get hreflang tags for content',
  })
  @ApiParam({ name: 'contentId', type: 'string' })
  async getHreflang(@Param('contentId', ParseUUIDPipe) contentId: string) {
    return this.geoService.getHreflangTags(contentId);
  }

  @Post('settings')
  @ApiAuth({
    summary: 'Create geo setting (admin only)',
  })
  async create(@Query() setting: any) {
    return this.geoService.create(setting);
  }

  @Patch('settings/:id')
  @ApiAuth({
    summary: 'Update geo setting (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Query() setting: any) {
    return this.geoService.update(id, setting);
  }
}

