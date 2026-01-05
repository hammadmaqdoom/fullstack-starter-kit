import { AuthGuard } from '@/auth/auth.guard';
import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiParam, ApiTags } from '@nestjs/swagger';
import { StructuredDataService } from './structured-data.service';
import { StructuredDataTemplateEntity } from './entities/structured-data-template.entity';

@ApiTags('structured-data')
@Controller({
  path: 'structured-data',
  version: '1',
})
@UseGuards(AuthGuard)
export class StructuredDataController {
  constructor(private readonly structuredDataService: StructuredDataService) {}

  @Get('generate/:contentId')
  @PublicAuth()
  @ApiAuth({
    summary: 'Generate JSON-LD schemas for content',
  })
  @ApiParam({ name: 'contentId', type: 'string' })
  async generateForContent(@Param('contentId', ParseUUIDPipe) contentId: string) {
    return this.structuredDataService.generateForContent(contentId);
  }

  @Post('schemas')
  @ApiAuth({
    summary: 'Create JSON-LD schema (admin only)',
  })
  async createSchema(
    @Body() body: { schemaData: any; contentId?: string; isGlobal?: boolean },
  ) {
    return this.structuredDataService.createSchema(
      body.schemaData,
      body.contentId,
      body.isGlobal,
    );
  }

  @Get('templates')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get all structured data templates',
  })
  async getTemplates() {
    return this.structuredDataService.findAllTemplates();
  }

  @Post('templates')
  @ApiAuth({
    summary: 'Create template (admin only)',
  })
  async createTemplate(@Body() template: Partial<StructuredDataTemplateEntity>) {
    return this.structuredDataService.createTemplate(template);
  }

  @Patch('templates/:id')
  @ApiAuth({
    summary: 'Update template (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() template: Partial<StructuredDataTemplateEntity>,
  ) {
    return this.structuredDataService.updateTemplate(id, template);
  }
}

