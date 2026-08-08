import { GlobalConfig } from '@/config/config.type';
import { AwsS3Service } from '@/services/aws/aws-s3.service';
import { AzureBlobService } from '@/services/azure/azure-blob.service';
import { LocalStorageService } from '@/services/local-storage.service';
import { File } from '@nest-lab/fastify-multer';
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Blob storage for candidate-submitted pre-boarding attachments (passport
 * scans, visa/pass copies). Mirrors EsignBlobStorageService's
 * Azure > S3 > local-fallback pattern — kept local to talent since
 * candidates authenticate via a magic-link token, not a MediaEntity-owning
 * user record.
 */
@Injectable()
export class PreBoardingBlobStorageService {
  private readonly useAzure: boolean;
  private readonly useS3: boolean;

  constructor(
    @Optional() private readonly azureBlobService: AzureBlobService,
    @Optional() private readonly awsS3Service: AwsS3Service,
    private readonly localStorageService: LocalStorageService,
    private readonly configService: ConfigService<GlobalConfig>,
  ) {
    this.useAzure = !!(
      this.azureBlobService && this.azureBlobService.isConfigured()
    );

    const region = this.configService.get('aws.region', { infer: true });
    const accessKey = this.configService.get('aws.accessKey', { infer: true });
    const secretKey = this.configService.get('aws.secretKey', { infer: true });
    const bucket = this.configService.get('aws.bucket', { infer: true });
    this.useS3 =
      !this.useAzure &&
      !!(region && accessKey && secretKey && bucket && this.awsS3Service);
  }

  async upload(file: File, folder = 'pre-boarding'): Promise<string> {
    if (this.useAzure) {
      const uploaded = await this.azureBlobService.uploadBuffer(file.buffer, {
        folder,
        filename: file.originalname,
        contentType: file.mimetype,
      });
      return uploaded.url;
    }

    if (this.useS3) {
      const uploaded = await this.awsS3Service.uploadBuffer(file.buffer, {
        folder,
        filename: file.originalname,
        contentType: file.mimetype,
      });
      return this.awsS3Service.getPublicUrl(uploaded.path);
    }

    const uploaded = await this.localStorageService.uploadFile(file, {
      folder,
    });
    return uploaded.url;
  }
}
