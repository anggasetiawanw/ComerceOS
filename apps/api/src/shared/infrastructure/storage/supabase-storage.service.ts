import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppConfigService } from '../../config/app-config.service';
import { StorageNotConfiguredError, StorageUploadFailedError } from '../../domain-errors/storage.errors';
import { StorageBucket, StorageUploader, UploadedObject } from './storage-uploader.port';

@Injectable()
export class SupabaseStorageService implements StorageUploader, OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly client: SupabaseClient | null;
  private readonly buckets: Record<StorageBucket, string>;

  constructor(private readonly config: AppConfigService) {
    this.buckets = { public: config.supabaseBucketPublic, private: config.supabaseBucketPrivate };
    this.client = config.isStorageConfigured
      ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey)
      : null;
  }

  onModuleInit(): void {
    this.logger.log(
      this.client
        ? 'Supabase Storage adapter active'
        : 'Supabase Storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY blank)',
    );
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async checkConnection(): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.storage.listBuckets();
    if (error) {
      throw new StorageUploadFailedError(error.message);
    }
  }

  async upload(params: {
    bucket: StorageBucket;
    path: string;
    contentType: string;
    body: Buffer;
  }): Promise<UploadedObject> {
    const client = this.requireClient();
    const bucketName = this.buckets[params.bucket];

    const { data, error } = await client.storage
      .from(bucketName)
      .upload(params.path, params.body, { contentType: params.contentType, upsert: false });

    if (error || !data) {
      throw new StorageUploadFailedError(error?.message ?? 'Upload failed with no error detail');
    }

    if (params.bucket === 'public') {
      const { data: publicUrlData } = client.storage.from(bucketName).getPublicUrl(data.path);
      return { path: data.path, url: publicUrlData.publicUrl };
    }

    const signedUrl = await this.createSignedUrl({
      bucket: params.bucket,
      path: data.path,
      expiresInSeconds: 3600,
    });
    return { path: data.path, url: signedUrl };
  }

  async remove(params: { bucket: StorageBucket; path: string }): Promise<void> {
    const client = this.requireClient();
    const bucketName = this.buckets[params.bucket];

    const { error } = await client.storage.from(bucketName).remove([params.path]);
    if (error) {
      throw new StorageUploadFailedError(error.message);
    }
  }

  async createSignedUrl(params: {
    bucket: StorageBucket;
    path: string;
    expiresInSeconds: number;
  }): Promise<string> {
    const client = this.requireClient();
    const bucketName = this.buckets[params.bucket];

    const { data, error } = await client.storage
      .from(bucketName)
      .createSignedUrl(params.path, params.expiresInSeconds);

    if (error || !data) {
      throw new StorageUploadFailedError(error?.message ?? 'Could not create a signed URL');
    }
    return data.signedUrl;
  }

  private requireClient(): SupabaseClient {
    if (!this.client) {
      throw new StorageNotConfiguredError();
    }
    return this.client;
  }
}
