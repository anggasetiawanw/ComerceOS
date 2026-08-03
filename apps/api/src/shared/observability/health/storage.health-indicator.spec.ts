import { HealthCheckError } from '@nestjs/terminus';
import { StorageUploader } from '../../infrastructure/storage/storage-uploader.port';
import { StorageHealthIndicator } from './storage.health-indicator';

class FakeStorageUploader implements StorageUploader {
  configured = false;
  shouldFailConnection = false;

  isConfigured(): boolean {
    return this.configured;
  }

  async checkConnection(): Promise<void> {
    if (this.shouldFailConnection) throw new Error('unreachable');
  }

  upload(): Promise<never> {
    throw new Error('not used in this test');
  }

  remove(): Promise<void> {
    throw new Error('not used in this test');
  }

  createSignedUrl(): Promise<string> {
    throw new Error('not used in this test');
  }

  download(): Promise<Buffer> {
    throw new Error('not used in this test');
  }
}

describe('StorageHealthIndicator', () => {
  it('returns up with configured: false and never throws when unconfigured', async () => {
    const storage = new FakeStorageUploader();
    const indicator = new StorageHealthIndicator(storage);

    const result = await indicator.isHealthy('storage');

    expect(result.storage).toMatchObject({ status: 'up', configured: false });
  });

  it('returns up with configured: true when the connection check succeeds', async () => {
    const storage = new FakeStorageUploader();
    storage.configured = true;
    const indicator = new StorageHealthIndicator(storage);

    const result = await indicator.isHealthy('storage');

    expect(result.storage).toMatchObject({ status: 'up', configured: true });
  });

  it('throws HealthCheckError when configured but the connection check fails', async () => {
    const storage = new FakeStorageUploader();
    storage.configured = true;
    storage.shouldFailConnection = true;
    const indicator = new StorageHealthIndicator(storage);

    await expect(indicator.isHealthy('storage')).rejects.toBeInstanceOf(HealthCheckError);
  });
});
