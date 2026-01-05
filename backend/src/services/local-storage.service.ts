import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { File } from '@nest-lab/fastify-multer';
import { promises as fs } from 'fs';
import { join } from 'path';
import { v4 as uuid } from 'uuid';
import { GlobalConfig } from '@/config/config.type';

export interface LocalStorageUploadOptions {
  filename?: string;
  folder?: string;
}

export interface LocalStorageUploadResponse {
  path: string;
  url: string;
  filename: string;
  originalname?: string;
  size?: number;
  mimetype?: string;
}

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService<GlobalConfig>) {
    // Default to 'uploads' directory in the project root
    this.uploadDir = join(process.cwd(), 'uploads');
    
    // Get base URL from config or use default
    const appUrl = this.configService.get('app.url', { infer: true });
    this.baseUrl = appUrl ? `${appUrl}/uploads` : 'http://localhost:3000/uploads';
    
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      this.logger.log(`Upload directory ensured at: ${this.uploadDir}`);
    } catch (error) {
      this.logger.error(`Failed to create upload directory: ${error.message}`);
    }
  }

  /**
   * Uploads a file to local storage
   * @param {File} file - File to be saved
   * @param {LocalStorageUploadOptions} options - Configuration for upload
   */
  async uploadFile(
    file: File,
    options: LocalStorageUploadOptions = {},
  ): Promise<LocalStorageUploadResponse> {
    const filename = this._generateFilename(options.filename || file.originalname);
    const folder = options.folder || 'media';
    
    // Create folder path
    const folderPath = join(this.uploadDir, folder);
    await fs.mkdir(folderPath, { recursive: true });
    
    // Full file path
    const filePath = join(folderPath, filename);
    const relativePath = join(folder, filename);
    
    // Write file to disk
    await fs.writeFile(filePath, file.buffer);
    
    this.logger.log(`File uploaded to local storage: ${relativePath}`);
    
    return {
      path: relativePath,
      url: `${this.baseUrl}/${relativePath}`,
      filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * Deletes a file from local storage
   * @param {string} path - Relative path to the file
   */
  async deleteFile(path: string): Promise<void> {
    try {
      const filePath = join(this.uploadDir, path);
      await fs.unlink(filePath);
      this.logger.log(`File deleted from local storage: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${path}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Checks if a file exists in local storage
   * @param {string} path - Relative path to the file
   */
  async fileExists(path: string): Promise<boolean> {
    try {
      const filePath = join(this.uploadDir, path);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private _generateFilename(name: string): string {
    const timestamp = Date.now();
    const randomId = uuid().replace(/-/g, '').slice(0, 16);
    const ext = name.split('.').pop();
    const nameWithoutExt = name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9]/g, '-');
    return `${timestamp}-${randomId}-${nameWithoutExt}.${ext}`;
  }
}

