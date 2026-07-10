import { GlobalConfig } from '@/config/config.type';
import { AwsS3Service } from '@/services/aws/aws-s3.service';
import { AzureBlobService } from '@/services/azure/azure-blob.service';
import { LocalStorageService } from '@/services/local-storage.service';
import { File } from '@nest-lab/fastify-multer';
import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Blob storage for released payslip PDFs. Mirrors the Azure > S3 > local
 * fallback pattern used by `PreBoardingBlobStorageService` /
 * `DocumentBlobStorageService` so payslip release works whether Azure Blob,
 * AWS S3, or neither is configured (local dev).
 */
@Injectable()
export class PayslipBlobStorageService {
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

  async upload(
    buffer: Buffer,
    folder: string,
    filename: string,
    contentType = 'application/pdf',
  ): Promise<string> {
    if (this.useAzure) {
      const uploaded = await this.azureBlobService.uploadBuffer(buffer, {
        folder,
        filename,
        contentType,
      });
      return uploaded.url;
    }

    if (this.useS3) {
      const uploaded = await this.awsS3Service.uploadBuffer(buffer, {
        folder,
        filename,
        contentType,
      });
      return this.awsS3Service.getPublicUrl(uploaded.path);
    }

    const fakeFile = {
      buffer,
      originalname: filename,
      mimetype: contentType,
      size: buffer.length,
    } as unknown as File;
    const uploaded = await this.localStorageService.uploadFile(fakeFile, {
      folder,
    });
    return uploaded.url;
  }
}
