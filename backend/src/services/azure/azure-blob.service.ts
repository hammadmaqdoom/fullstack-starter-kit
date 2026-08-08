import { GlobalConfig } from '@/config/config.type';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

export type AzureBlobUploadOptions = {
  filename: string;
  folder?: string;
  contentType?: string;
};

export type AzureBlobUploadResponse = {
  path: string;
  filename: string;
  url: string;
};

/**
 * Azure Blob Storage adapter for Polaris documents (0.1 — Azure Blob storage
 * adapter for documents, tasks.md). Mirrors `AwsS3Service`'s shape so callers
 * (`EsignBlobStorageService`, `PreBoardingBlobStorageService`) can select it
 * via the same optional-provider factory pattern. Only initialized when
 * `AZURE_STORAGE_CONNECTION_STRING` is set.
 */
@Injectable()
export class AzureBlobService {
  private readonly logger = new Logger(AzureBlobService.name);
  private readonly blobServiceClient: BlobServiceClient | null = null;
  private readonly containerName: string;
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService<GlobalConfig>) {
    const azure = this.configService.get('azure', { infer: true });
    const connectionString = azure?.storageConnectionString;
    this.containerName = azure?.storageContainer ?? 'polaris-documents';

    this.isEnabled = !!connectionString;

    if (this.isEnabled) {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(
        connectionString!,
      );
    }
  }

  private ensureEnabled(): void {
    if (!this.isEnabled || !this.blobServiceClient) {
      throw new Error(
        'Azure Blob Storage is not configured. Please set AZURE_STORAGE_CONNECTION_STRING.',
      );
    }
  }

  private async getContainerClient(): Promise<ContainerClient> {
    this.ensureEnabled();
    const containerClient = this.blobServiceClient!.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists();
    return containerClient;
  }

  async uploadBuffer(
    buffer: Buffer,
    options: AzureBlobUploadOptions,
  ): Promise<AzureBlobUploadResponse> {
    this.ensureEnabled();
    const filename = this.generateFilename(options.filename);
    const path = options.folder ? `${options.folder}/${filename}` : filename;

    const containerClient = await this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(path);
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: options.contentType ?? 'application/octet-stream',
      },
    });

    return { path, filename, url: blockBlobClient.url };
  }

  async downloadBuffer(path: string): Promise<Buffer> {
    this.ensureEnabled();
    const containerClient = await this.getContainerClient();
    const blockBlobClient = containerClient.getBlockBlobClient(path);
    const downloadResponse = await blockBlobClient.download();
    const stream = downloadResponse.readableStreamBody;
    if (!stream) {
      throw new Error(`Azure blob ${path} has no readable content`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  getPublicUrl(path: string): string {
    this.ensureEnabled();
    const containerClient = this.blobServiceClient!.getContainerClient(
      this.containerName,
    );
    return containerClient.getBlockBlobClient(path).url;
  }

  isConfigured(): boolean {
    return this.isEnabled;
  }

  private generateFilename(name: string): string {
    return `${uuid().replace(/-/g, '').slice(0, 16)}-${name}`;
  }
}
