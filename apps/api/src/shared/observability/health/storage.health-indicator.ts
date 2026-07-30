import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import {
  STORAGE_UPLOADER,
  StorageUploader,
} from '../../infrastructure/storage/storage-uploader.port';

@Injectable()
export class StorageHealthIndicator {
  constructor(@Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    if (!this.storage.isConfigured()) {
      return {
        [key]: { status: 'up', configured: false, message: 'Supabase Storage not configured' },
      };
    }

    try {
      await this.storage.checkConnection();
      return { [key]: { status: 'up', configured: true } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError('Storage check failed', {
        [key]: { status: 'down', configured: true, message },
      });
    }
  }
}
