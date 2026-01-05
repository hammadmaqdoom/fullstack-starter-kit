import { AuthGuard } from '@/auth/auth.guard';
import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { SeoService } from './seo.service';
import { CreateSeoMetadataDto } from './dto/create-seo-metadata.dto';

@ApiTags('seo')
@Controller({
  path: 'seo',
  version: '1',
})
@UseGuards(AuthGuard)
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Get('metadata/:contentId')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get SEO metadata by content id',
  })
  @ApiParam({ name: 'contentId', type: 'string' })
  async getMetadata(@Param('contentId') contentId: string) {
    return this.seoService.getMetadataByContentId(contentId);
  }

  @Post('metadata')
  @ApiAuth({
    summary: 'Create or update SEO metadata (admin only)',
  })
  async createOrUpdateMetadata(@Body() dto: CreateSeoMetadataDto) {
    return this.seoService.createOrUpdateMetadata(dto);
  }

  @Get('verification')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get all verification codes',
  })
  async getVerifications() {
    return this.seoService.getAllVerifications();
  }

  @Get('sitemap.xml')
  @PublicAuth()
  @ApiAuth({
    summary: 'Generate sitemap.xml',
  })
  @ApiQuery({ name: 'locale', required: false, type: String })
  async getSitemap(@Query('locale') locale: string | undefined, @Res() reply: FastifyReply) {
    const sitemap = await this.seoService.generateSitemap(locale);
    reply.type('application/xml');
    return reply.send(sitemap);
  }

  @Get('robots.txt')
  @PublicAuth()
  @ApiAuth({
    summary: 'Generate robots.txt',
  })
  async getRobotsTxt(@Res() reply: FastifyReply) {
    const robots = await this.seoService.generateRobotsTxt();
    reply.type('text/plain');
    return reply.send(robots);
  }
}

