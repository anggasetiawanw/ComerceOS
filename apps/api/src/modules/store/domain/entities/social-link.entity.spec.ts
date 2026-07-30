import { SocialPlatform } from '../value-objects/social-platform.vo';
import { SocialLink } from './social-link.entity';

const instagram = SocialPlatform.create('instagram').unwrap();
const whatsapp = SocialPlatform.create('whatsapp').unwrap();

describe('SocialLink', () => {
  it('accepts a valid https URL for a non-whatsapp platform', () => {
    const result = SocialLink.create({
      storeId: 'store-1',
      platform: instagram,
      url: 'https://instagram.com/tokosaya',
      position: 0,
    });
    expect(result.isOk()).toBe(true);
  });

  it('rejects a non-https URL', () => {
    const result = SocialLink.create({
      storeId: 'store-1',
      platform: instagram,
      url: 'http://instagram.com/tokosaya',
      position: 0,
    });
    expect(result.isErr()).toBe(true);
  });

  it('accepts a wa.me URL for whatsapp', () => {
    const result = SocialLink.create({
      storeId: 'store-1',
      platform: whatsapp,
      url: 'https://wa.me/6281234567890',
      position: 0,
    });
    expect(result.isOk()).toBe(true);
  });

  it('rejects a non-whatsapp URL for the whatsapp platform', () => {
    const result = SocialLink.create({
      storeId: 'store-1',
      platform: whatsapp,
      url: 'https://instagram.com/tokosaya',
      position: 0,
    });
    expect(result.isErr()).toBe(true);
  });

  it('rejects a negative position', () => {
    const result = SocialLink.create({
      storeId: 'store-1',
      platform: instagram,
      url: 'https://instagram.com/tokosaya',
      position: -1,
    });
    expect(result.isErr()).toBe(true);
  });

  it('update() validates the new url against the (possibly new) platform', () => {
    const link = SocialLink.create({
      storeId: 'store-1',
      platform: instagram,
      url: 'https://instagram.com/tokosaya',
      position: 0,
    }).unwrap();

    const badUpdate = link.update({ platform: whatsapp });
    expect(badUpdate.isErr()).toBe(true);
    expect(link.platform.value).toBe('instagram');

    const goodUpdate = link.update({ platform: whatsapp, url: 'https://wa.me/6281234567890' });
    expect(goodUpdate.isOk()).toBe(true);
    expect(link.platform.value).toBe('whatsapp');
    expect(link.url).toBe('https://wa.me/6281234567890');
  });

  it('changePosition mutates position in place', () => {
    const link = SocialLink.create({
      storeId: 'store-1',
      platform: instagram,
      url: 'https://instagram.com/tokosaya',
      position: 0,
    }).unwrap();
    link.changePosition(3);
    expect(link.position).toBe(3);
  });
});
