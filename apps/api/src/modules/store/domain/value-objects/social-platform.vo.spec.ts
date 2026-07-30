import { SocialPlatform } from './social-platform.vo';

describe('SocialPlatform', () => {
  it.each(['instagram', 'tiktok', 'whatsapp', 'youtube', 'other'])('accepts "%s"', (value) => {
    const result = SocialPlatform.create(value);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe(value);
  });

  it('rejects an unknown platform', () => {
    const result = SocialPlatform.create('facebook');
    expect(result.isErr()).toBe(true);
  });
});
