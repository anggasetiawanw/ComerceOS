import { AppConfigService } from '../../config/app-config.service';
import { StorageNotConfiguredError, StorageUploadFailedError } from '../../domain-errors/storage.errors';
import { SupabaseStorageService } from './supabase-storage.service';

const unconfiguredConfig = {
  supabaseUrl: '',
  supabaseServiceRoleKey: '',
  supabaseBucketPublic: '',
  supabaseBucketPrivate: '',
  isStorageConfigured: false,
} as unknown as AppConfigService;

const configuredConfig = {
  supabaseUrl: 'https://project.supabase.co',
  supabaseServiceRoleKey: 'service-role-key',
  supabaseBucketPublic: 'nagihin-public',
  supabaseBucketPrivate: 'nagihin-private',
  isStorageConfigured: true,
} as unknown as AppConfigService;

describe('SupabaseStorageService (unconfigured)', () => {
  const service = new SupabaseStorageService(unconfiguredConfig);

  it('isConfigured returns false', () => {
    expect(service.isConfigured()).toBe(false);
  });

  it('upload rejects with StorageNotConfiguredError', async () => {
    await expect(
      service.upload({ bucket: 'public', path: 'a.png', contentType: 'image/png', body: Buffer.from('') }),
    ).rejects.toBeInstanceOf(StorageNotConfiguredError);
  });

  it('remove rejects with StorageNotConfiguredError', async () => {
    await expect(service.remove({ bucket: 'public', path: 'a.png' })).rejects.toBeInstanceOf(
      StorageNotConfiguredError,
    );
  });

  it('createSignedUrl rejects with StorageNotConfiguredError', async () => {
    await expect(
      service.createSignedUrl({ bucket: 'public', path: 'a.png', expiresInSeconds: 60 }),
    ).rejects.toBeInstanceOf(StorageNotConfiguredError);
  });

  it('checkConnection rejects with StorageNotConfiguredError', async () => {
    await expect(service.checkConnection()).rejects.toBeInstanceOf(StorageNotConfiguredError);
  });
});

describe('SupabaseStorageService (configured, with a fake client)', () => {
  it('delegates upload and returns the public URL', async () => {
    const service = new SupabaseStorageService(configuredConfig);
    const fakeBucket = {
      upload: jest.fn().mockResolvedValue({ data: { path: 'stores/1/avatar/x.png' }, error: null }),
      getPublicUrl: jest
        .fn()
        .mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/stores/1/avatar/x.png' } }),
    };
    const fakeClient = { storage: { from: jest.fn().mockReturnValue(fakeBucket) } };
    Object.defineProperty(service, 'client', { value: fakeClient, writable: true });

    const result = await service.upload({
      bucket: 'public',
      path: 'stores/1/avatar/x.png',
      contentType: 'image/png',
      body: Buffer.from('data'),
    });

    expect(result.url).toBe('https://cdn.example.com/stores/1/avatar/x.png');
    expect(fakeBucket.upload).toHaveBeenCalledWith('stores/1/avatar/x.png', expect.any(Buffer), {
      contentType: 'image/png',
      upsert: false,
    });
  });

  it('maps a provider upload error to StorageUploadFailedError', async () => {
    const service = new SupabaseStorageService(configuredConfig);
    const fakeBucket = {
      upload: jest.fn().mockResolvedValue({ data: null, error: { message: 'Duplicate' } }),
    };
    const fakeClient = { storage: { from: jest.fn().mockReturnValue(fakeBucket) } };
    Object.defineProperty(service, 'client', { value: fakeClient, writable: true });

    await expect(
      service.upload({ bucket: 'public', path: 'x.png', contentType: 'image/png', body: Buffer.from('') }),
    ).rejects.toBeInstanceOf(StorageUploadFailedError);
  });
});
