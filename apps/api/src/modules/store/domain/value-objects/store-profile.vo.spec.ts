import { StoreProfile } from './store-profile.vo';

describe('StoreProfile', () => {
  it('accepts a minimal valid profile', () => {
    const result = StoreProfile.create({ displayName: 'Toko Saya' });
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().bio).toBeNull();
  });

  it('rejects an empty display name', () => {
    const result = StoreProfile.create({ displayName: '   ' });
    expect(result.isErr()).toBe(true);
  });

  it('rejects a display name over 100 characters', () => {
    const result = StoreProfile.create({ displayName: 'a'.repeat(101) });
    expect(result.isErr()).toBe(true);
  });

  it('rejects a bio over 500 characters', () => {
    const result = StoreProfile.create({ displayName: 'Toko', bio: 'a'.repeat(501) });
    expect(result.isErr()).toBe(true);
  });

  it('rejects a non-https avatar URL', () => {
    const result = StoreProfile.create({
      displayName: 'Toko',
      avatarUrl: 'http://example.com/a.png',
    });
    expect(result.isErr()).toBe(true);
  });

  it('rejects a malformed banner URL', () => {
    const result = StoreProfile.create({ displayName: 'Toko', bannerUrl: 'not-a-url' });
    expect(result.isErr()).toBe(true);
  });

  it('accepts absolute https avatar and banner URLs', () => {
    const result = StoreProfile.create({
      displayName: 'Toko',
      avatarUrl: 'https://cdn.example.com/a.png',
      bannerUrl: 'https://cdn.example.com/b.png',
    });
    expect(result.isOk()).toBe(true);
  });

  it('withAvatarUrl and withBannerUrl produce a new instance without mutating fields', () => {
    const profile = StoreProfile.create({ displayName: 'Toko' }).unwrap();
    const withAvatar = profile.withAvatarUrl('https://cdn.example.com/a.png');
    expect(withAvatar.avatarUrl).toBe('https://cdn.example.com/a.png');
    expect(profile.avatarUrl).toBeNull();
    const withBanner = withAvatar.withBannerUrl('https://cdn.example.com/b.png');
    expect(withBanner.bannerUrl).toBe('https://cdn.example.com/b.png');
    expect(withBanner.avatarUrl).toBe('https://cdn.example.com/a.png');
  });
});
