import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared/infrastructure/redis/redis.constants';
import {
  OAuthStateRecord,
  OAuthStateStore,
} from '../../application/ports/oauth-state-store.port';

const STATE_TTL_SECONDS = 10 * 60;
const KEY_PREFIX = 'identity:oauth-state:';

const isOAuthStateRecord = (value: unknown): value is OAuthStateRecord => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('codeVerifier' in value) || !('redirectUri' in value)) return false;
  return typeof value.codeVerifier === 'string' && typeof value.redirectUri === 'string';
};

@Injectable()
export class RedisOAuthStateStore implements OAuthStateStore {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async save(state: string, record: OAuthStateRecord): Promise<void> {
    await this.redis.set(KEY_PREFIX + state, JSON.stringify(record), 'EX', STATE_TTL_SECONDS);
  }

  async consume(state: string): Promise<OAuthStateRecord | null> {
    const key = KEY_PREFIX + state;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    await this.redis.del(key);

    const parsed: unknown = JSON.parse(raw);
    return isOAuthStateRecord(parsed) ? parsed : null;
  }
}
