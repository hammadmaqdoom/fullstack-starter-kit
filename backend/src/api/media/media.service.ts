import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaEntity } from './entities/media.entity';
import { AwsS3Service } from '@/services/aws/aws-s3.service';
import { File } from '@nest-lab/fastify-multer';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(MediaEntity)
    private readonly mediaRepository: Repository<MediaEntity>,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  async uploadMedia(file: File, userId: string, metadata?: {
    altText?: string;
    caption?: string;
    title?: string;
  }) {
    const uploaded = await this.awsS3Service.uploadFile(file, {
      filename: file.originalname,
    });

    const media = this.mediaRepository.create({
      filename: file.originalname,
      url: uploaded.location || uploaded.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedByUserId: userId,
      ...metadata,
    });

    return this.mediaRepository.save(media);
  }

  async findAll() {
    return this.mediaRepository.find({
      order: { createdAt: 'DESC' },
      relations: ['uploadedBy'],
    });
  }

  async findById(id: string) {
    return this.mediaRepository.findOne({
      where: { id },
      relations: ['uploadedBy'],
    });
  }

  async delete(id: string) {
    await this.mediaRepository.softDelete(id);
  }
}

