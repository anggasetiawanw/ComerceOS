import { rm } from 'node:fs/promises';
import * as path from 'node:path';
import { AppConfigService } from '../../config/app-config.service';
import { FilesystemStorageUploader } from './filesystem-storage.service';

const config = { frontendUrl: 'http://localhost:3000' } as unknown as AppConfigService;

describe('FilesystemStorageUploader', () => {
  const uploader = new FilesystemStorageUploader(config);
  const uploadDir = path.resolve(process.cwd(), '..', '..', 'web', 'public', 'uploads');

  afterAll(async () => {
    await rm(path.join(uploadDir, 'public', 'test'), { recursive: true, force: true }).catch(() => undefined);
  });

  it('is always configured', () => {
    expect(uploader.isConfigured()).toBe(true);
  });

  it('writes the file and returns a frontend-relative URL', async () => {
    const result = await uploader.upload({
      bucket: 'public',
      path: 'test/a.png',
      contentType: 'image/png',
      body: Buffer.from('fake-image-bytes'),
    });

    expect(result.path).toBe('test/a.png');
    expect(result.url).toBe('http://localhost:3000/uploads/public/test/a.png');
  });

  it('remove does not throw for a missing file', async () => {
    await expect(uploader.remove({ bucket: 'public', path: 'test/does-not-exist.png' })).resolves.toBeUndefined();
  });
});
