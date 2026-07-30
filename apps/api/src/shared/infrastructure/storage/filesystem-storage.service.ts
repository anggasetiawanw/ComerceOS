import { Injectable, Logger } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { AppConfigService } from '../../config/app-config.service';
import { StorageBucket, StorageUploader, UploadedObject } from './storage-uploader.port';

@Injectable()
export class FilesystemStorageUploader implements StorageUploader {
  private readonly logger = new Logger(FilesystemStorageUploader.name);
  private readonly uploadDir = path.resolve(process.cwd(), '..', '..', 'web', 'public', 'uploads');

  constructor(private readonly config: AppConfigService) {}

  isConfigured(): boolean {
    return true;
  }

  async checkConnection(): Promise<void> {
    await mkdir(this.uploadDir, { recursive: true });
  }

  async upload(params: {
    bucket: StorageBucket;
    path: string;
    contentType: string;
    body: Buffer;
  }): Promise<UploadedObject> {
    const destination = path.join(this.uploadDir, params.bucket, params.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, params.body);
    return { path: params.path, url: this.publicUrl(params.bucket, params.path) };
  }

  async remove(params: { bucket: StorageBucket; path: string }): Promise<void> {
    const destination = path.join(this.uploadDir, params.bucket, params.path);
    try {
      await unlink(destination);
    } catch (error) {
      this.logger.warn(`Could not remove local upload "${destination}": ${String(error)}`);
    }
  }

  async createSignedUrl(params: { bucket: StorageBucket; path: string }): Promise<string> {
    return this.publicUrl(params.bucket, params.path);
  }

  private publicUrl(bucket: StorageBucket, objectPath: string): string {
    return `${this.config.frontendUrl}/uploads/${bucket}/${objectPath}`;
  }
}
