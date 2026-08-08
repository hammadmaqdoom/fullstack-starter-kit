import { GlobalConfig } from '@/config/config.type';
import { AwsS3Service } from '@/services/aws/aws-s3.service';
import { AzureBlobService } from '@/services/azure/azure-blob.service';
import { LocalStorageService } from '@/services/local-storage.service';
import { File } from '@nest-lab/fastify-multer';
import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Blob storage for e-sign documents/seals/certificates. Backend preference
 * order is Azure Blob > S3 > local disk (tasks.md 0.1 — Azure Blob storage
 * adapter for documents), so sealing works in dev (no cloud creds),
 * Azure-hosted prod, and S3-hosted prod without code branching in callers.
 */
@Injectable()
export class EsignBlobStorageService {
  private readonly logger = new Logger(EsignBlobStorageService.name);
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

  async download(url: string): Promise<Buffer> {
    if (!url) {
      throw new Error('A blob URL is required to download the document');
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return Buffer.from(response.data as ArrayBuffer);
    }

    if (this.useAzure) {
      return this.azureBlobService.downloadBuffer(url);
    }

    if (this.useS3) {
      return this.awsS3Service.downloadBuffer(url);
    }

    throw new Error(
      `Cannot resolve blob URL "${url}" — no storage backend configured to fetch it`,
    );
  }
}
