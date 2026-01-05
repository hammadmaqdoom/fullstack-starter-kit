import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaEntity } from './entities/media.entity';
import { AwsS3Service } from '@/services/aws/aws-s3.service';
import { LocalStorageService } from '@/services/local-storage.service';
import { File } from '@nest-lab/fastify-multer';
import { ConfigService } from '@nestjs/config';
import { GlobalConfig } from '@/config/config.type';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly useS3: boolean;

  constructor(
    @InjectRepository(MediaEntity)
    private readonly mediaRepository: Repository<MediaEntity>,
    @Optional() private readonly awsS3Service: AwsS3Service,
    private readonly localStorageService: LocalStorageService,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {
    // Check if S3 is configured
    const awsRegion = this.configService.get('aws.region', { infer: true });
    const awsAccessKey = this.configService.get('aws.accessKey', { infer: true });
    const awsSecretKey = this.configService.get('aws.secretKey', { infer: true });
    const awsBucket = this.configService.get('aws.bucket', { infer: true });

    this.useS3 = !!(awsRegion && awsAccessKey && awsSecretKey && awsBucket && this.awsS3Service);

    if (this.useS3) {
      this.logger.log('Using AWS S3 for media storage');
    } else {
      this.logger.warn('AWS S3 not configured. Using local file storage as fallback');
    }
  }

  async uploadMedia(file: File, userId: string, metadata?: {
    altText?: string;
    caption?: string;
    title?: string;
  }) {
    let uploaded: { path: string; url?: string };

    try {
      if (this.useS3) {
        // Try to upload to S3
        uploaded = await this.awsS3Service.uploadFile(file, {
          filename: file.originalname,
        });
        this.logger.log(`File uploaded to S3: ${uploaded.path}`);
      } else {
        // Use local storage
        uploaded = await this.localStorageService.uploadFile(file, {
          filename: file.originalname,
          folder: 'media',
        });
        this.logger.log(`File uploaded to local storage: ${uploaded.path}`);
      }
    } catch (error) {
      // If S3 fails, fallback to local storage
      if (this.useS3) {
        this.logger.error(`S3 upload failed, falling back to local storage: ${error.message}`);
        uploaded = await this.localStorageService.uploadFile(file, {
          filename: file.originalname,
          folder: 'media',
        });
      } else {
        throw error;
      }
    }

    const media = this.mediaRepository.create({
      filename: file.originalname,
      url: uploaded.url || uploaded.path,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedByUserId: userId,
      storageType: this.useS3 ? 's3' : 'local',
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

