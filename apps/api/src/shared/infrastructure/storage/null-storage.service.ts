import { Injectable } from '@nestjs/common';
import { StorageNotConfiguredError } from '../../domain-errors/storage.errors';
import { StorageBucket, StorageUploader, UploadedObject } from './storage-uploader.port';

@Injectable()
export class NullStorageUploader implements StorageUploader {
  isConfigured(): boolean {
    return false;
  }

  async checkConnection(): Promise<void> {
    throw new StorageNotConfiguredError();
  }

  async upload(_params: {
    bucket: StorageBucket;
    path: string;
    contentType: string;
    body: Buffer;
  }): Promise<UploadedObject> {
    throw new StorageNotConfiguredError();
  }

  async remove(_params: { bucket: StorageBucket; path: string }): Promise<void> {
    throw new StorageNotConfiguredError();
  }

  async createSignedUrl(_params: {
    bucket: StorageBucket;
    path: string;
    expiresInSeconds: number;
  }): Promise<string> {
    throw new StorageNotConfiguredError();
  }

  async download(_params: { bucket: StorageBucket; path: string }): Promise<Buffer> {
    throw new StorageNotConfiguredError();
  }
}
