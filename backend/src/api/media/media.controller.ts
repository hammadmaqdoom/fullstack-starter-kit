import { AuthGuard } from '@/auth/auth.guard';
import { CurrentUserSession } from '@/decorators/auth/current-user-session.decorator';
import { PublicAuth } from '@/decorators/auth/public-auth.decorator';
import { ApiAuth } from '@/decorators/http.decorators';
import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nest-lab/fastify-multer';
import { ApiConsumes, ApiParam, ApiTags } from '@nestjs/swagger';
import { MediaService } from './media.service';

@ApiTags('media')
@Controller({
  path: 'media',
  version: '1',
})
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @PublicAuth()
  @ApiAuth({
    summary: 'List all media (public)',
  })
  async findAll() {
    return this.mediaService.findAll();
  }

  @Get(':id')
  @PublicAuth()
  @ApiAuth({
    summary: 'Get media by id',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.findById(id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiAuth({
    summary: 'Upload media (admin only)',
  })
  async upload(
    @CurrentUserSession('user') user: CurrentUserSession['user'],
    // @UploadedFile() file: File, // Will be available via request
  ) {
    // File handling will be done via request object in Fastify
    // This is a placeholder - actual implementation needs Fastify file handling
    return { message: 'Upload endpoint - implementation needed' };
  }

  @Delete(':id')
  @ApiAuth({
    summary: 'Delete media (admin only)',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.mediaService.delete(id);
  }
}

