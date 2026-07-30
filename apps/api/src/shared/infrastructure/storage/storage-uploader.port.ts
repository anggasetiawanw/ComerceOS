export const STORAGE_UPLOADER = Symbol('STORAGE_UPLOADER');

export type StorageBucket = 'public' | 'private';

export interface UploadedObject {
  path: string;
  url: string;
}

export interface StorageUploader {
  isConfigured(): boolean;
  checkConnection(): Promise<void>;
  upload(params: {
    bucket: StorageBucket;
    path: string;
    contentType: string;
    body: Buffer;
  }): Promise<UploadedObject>;
  remove(params: { bucket: StorageBucket; path: string }): Promise<void>;
  createSignedUrl(params: { bucket: StorageBucket; path: string; expiresInSeconds: number }): Promise<string>;
}
