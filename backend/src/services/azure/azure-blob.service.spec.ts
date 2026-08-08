import { GlobalConfig } from '@/config/config.type';
import { ConfigService } from '@nestjs/config';
import { AzureBlobService } from './azure-blob.service';

describe('AzureBlobService', () => {
  const buildService = (azure: {
    storageConnectionString?: string;
    storageContainer?: string;
  }) => {
    const configService = {
      get: jest.fn(() => azure),
    } as unknown as ConfigService<GlobalConfig>;
    return new AzureBlobService(configService);
  };

  it('reports isConfigured() = false when no connection string is set', () => {
    const service = buildService({});

    expect(service.isConfigured()).toBe(false);
  });

  it('reports isConfigured() = true when a connection string is set', () => {
    const service = buildService({
      storageConnectionString:
        'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=dGVzdA==;EndpointSuffix=core.windows.net',
      storageContainer: 'polaris-documents',
    });

    expect(service.isConfigured()).toBe(true);
  });

  it('throws when calling uploadBuffer while not configured', async () => {
    const service = buildService({});

    await expect(
      service.uploadBuffer(Buffer.from('data'), { filename: 'test.pdf' }),
    ).rejects.toThrow('Azure Blob Storage is not configured');
  });

  it('throws when calling getPublicUrl while not configured', () => {
    const service = buildService({});

    expect(() => service.getPublicUrl('some/path.pdf')).toThrow(
      'Azure Blob Storage is not configured',
    );
  });
});
