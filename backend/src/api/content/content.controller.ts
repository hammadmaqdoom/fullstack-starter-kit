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
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { ContentDto } from './dto/content.dto';
import { OffsetPaginatedDto } from '@/common/dto/offset-pagination/paginated.dto';

@ApiTags('content')
@Controller({
  path: 'contents',
  version: '1',
})
@UseGuards(AuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  @PublicAuth()
  @ApiAuth({
    summary: 'List all contents (public)',
    type: ContentDto,
    isPaginated: true,
  })
  async findAll(@Query() dto: QueryContentDto): Promise<OffsetPaginatedDto<ContentDto>> {
    return this.contentService.findAll(dto);
  }

  @Get('slug/:slug')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get content by slug (public)',
  })
  @ApiParam({ name: 'slug', type: 'string' })
  @ApiQuery({ name: 'includeDrafts', required: false, type: Boolean })
  async findBySlug(
    @Param('slug') slug: string,
    @Query('includeDrafts') includeDrafts?: string,
  ): Promise<ContentDto> {
    return this.contentService.findBySlug(slug, includeDrafts === 'true');
  }

  @Get(':id')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get content by id',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<ContentDto> {
    return this.contentService.findById(id);
  }

  @Post()
  @ApiAuth({
    summary: 'Create content (admin only)',
  })
  async create(
    @Body() dto: CreateContentDto,
    @CurrentUserSession('user') user: CurrentUserSession['user'],
  ): Promise<ContentDto> {
    return this.contentService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiAuth({
    summary: 'Update content (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDto,
  ): Promise<ContentDto> {
    return this.contentService.update(id, dto);
  }

  @Post(':id/publish')
  @ApiAuth({
    summary: 'Publish content (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async publish(@Param('id', ParseUUIDPipe) id: string): Promise<ContentDto> {
    return this.contentService.publish(id);
  }

  @Post(':id/unpublish')
  @ApiAuth({
    summary: 'Unpublish content (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async unpublish(@Param('id', ParseUUIDPipe) id: string): Promise<ContentDto> {
    return this.contentService.unpublish(id);
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete content (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.contentService.delete(id);
  }

  @Get(':id/versions')
  @ApiAuth({
    summary: 'Get content versions (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async getVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.getVersions(id);
  }
}

