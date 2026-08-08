import { GlobalConfig } from '@/config/config.type';
import { AwsS3Service } from '@/services/aws/aws-s3.service';
import { LocalStorageService } from '@/services/local-storage.service';
import { File } from '@nest-lab/fastify-multer';
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Blob storage for generated report exports (CSV). Mirrors the S3-primary /
 * local-fallback pattern used by EsignBlobStorageService so exports work in
 * dev (no AWS creds) and production without branching in callers.
 */
@Injectable()
export class ReportBlobStorageService {
  private readonly useS3: boolean;

  constructor(
    @Optional() private readonly awsS3Service: AwsS3Service,
    private readonly localStorageService: LocalStorageService,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {
    const region = this.configService.get('aws.region', { infer: true });
    const accessKey = this.configService.get('aws.accessKey', { infer: true });
    const secretKey = this.configService.get('aws.secretKey', { infer: true });
    const bucket = this.configService.get('aws.bucket', { infer: true });
    this.useS3 = !!(
      region &&
      accessKey &&
      secretKey &&
      bucket &&
      this.awsS3Service
    );
  }

  async uploadCsv(csv: string, filename: string): Promise<string> {
    const buffer = Buffer.from(csv, 'utf-8');

    if (this.useS3) {
      const uploaded = await this.awsS3Service.uploadBuffer(buffer, {
        folder: 'reports',
        filename,
        contentType: 'text/csv',
      });
      return this.awsS3Service.getPublicUrl(uploaded.path);
    }

    const fakeFile = {
      buffer,
      originalname: filename,
      mimetype: 'text/csv',
      size: buffer.length,
    } as unknown as File;
    const uploaded = await this.localStorageService.uploadFile(fakeFile, {
      folder: 'reports',
    });
    return uploaded.url;
  }
}
