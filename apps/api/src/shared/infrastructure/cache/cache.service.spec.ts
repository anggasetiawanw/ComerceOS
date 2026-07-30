import type Redis from 'ioredis';
import { CacheService } from './cache.service';
import { buildCacheKey } from './cache.keys';

interface FakeValue {
  name: string;
}

const isFakeValue = (value: unknown): value is FakeValue => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('name' in value)) return false;
  return typeof value.name === 'string';
};

class FakeRedis {
  store = new Map<string, string>();

  get = jest.fn(async (key: string) => this.store.get(key) ?? null);
  set = jest.fn(async (key: string, value: string) => {
    this.store.set(key, value);
    return 'OK';
  });
  del = jest.fn(async (...keys: string[]) => {
    let removed = 0;
    for (const key of keys) {
      if (this.store.delete(key)) removed += 1;
    }
    return removed;
  });
}

describe('cache.keys', () => {
  it('produces the versioned namespaced shape', () => {
    expect(buildCacheKey('storefront', 'v1', 'tokosaya')).toBe('nagihin:storefront:v1:tokosaya');
  });
});

describe('CacheService', () => {
  it('getOrSet calls the loader and sets with the TTL on a miss', async () => {
    const redis = new FakeRedis();
    const cache = new CacheService(redis as unknown as Redis);

    const result = await cache.getOrSet('key-1', 60, isFakeValue, async () => ({ name: 'a' }));

    expect(result).toEqual({ name: 'a' });
    expect(redis.set).toHaveBeenCalledWith('key-1', JSON.stringify({ name: 'a' }), 'EX', 60);
  });

  it('getOrSet does not call the loader on a hit', async () => {
    const redis = new FakeRedis();
    const cache = new CacheService(redis as unknown as Redis);
    await cache.set('key-1', { name: 'a' }, 60);

    const loader = jest.fn(async () => ({ name: 'b' }));
    const result = await cache.getOrSet('key-1', 60, isFakeValue, loader);

    expect(result).toEqual({ name: 'a' });
    expect(loader).not.toHaveBeenCalled();
  });

  it('treats a value failing the guard as a miss and deletes the key', async () => {
    const redis = new FakeRedis();
    redis.store.set('key-1', JSON.stringify({ wrong: true }));
    const cache = new CacheService(redis as unknown as Redis);

    const result = await cache.get('key-1', isFakeValue);

    expect(result).toBeNull();
    expect(redis.del).toHaveBeenCalledWith('key-1');
  });

  it('del removes multiple keys', async () => {
    const redis = new FakeRedis();
    const cache = new CacheService(redis as unknown as Redis);
    await cache.set('a', { name: 'a' }, 60);
    await cache.set('b', { name: 'b' }, 60);

    await cache.del('a', 'b');

    expect(redis.del).toHaveBeenCalledWith('a', 'b');
  });
});
