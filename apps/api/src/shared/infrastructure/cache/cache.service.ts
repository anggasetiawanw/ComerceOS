import { Inject, Injectable, Logger } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string, isValue: (value: unknown) => value is T): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (isValue(parsed)) return parsed;

    this.logger.warn(`Cache value at "${key}" failed shape validation; treating as a miss`);
    await this.redis.del(key);
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    isValue: (value: unknown) => value is T,
    load: () => Promise<T | null>,
  ): Promise<T | null> {
    const cached = await this.get(key, isValue);
    if (cached !== null) return cached;

    const loaded = await load();
    if (loaded !== null) {
      await this.set(key, loaded, ttlSeconds);
    }
    return loaded;
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.redis.del(...keys);
  }
}
