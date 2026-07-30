import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../../shared/infrastructure/redis/redis.constants';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { UsernameReservationStore } from '../../application/ports/username-reservation-store.port';

const COOLDOWN_PREFIX = 'nagihin:store:username-cooldown:';
const RESERVED_PREFIX = 'nagihin:store:username-reserved:';
const DAY_IN_SECONDS = 24 * 60 * 60;

@Injectable()
export class RedisUsernameReservationStore implements UsernameReservationStore {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: AppConfigService,
  ) {}

  async isOnCooldown(storeId: string): Promise<boolean> {
    const value = await this.redis.get(COOLDOWN_PREFIX + storeId);
    return value !== null;
  }

  async startCooldown(storeId: string): Promise<void> {
    const ttl = this.config.usernameChangeCooldownDays * DAY_IN_SECONDS;
    if (ttl <= 0) return;
    await this.redis.set(COOLDOWN_PREFIX + storeId, '1', 'EX', ttl);
  }

  async isReserved(username: string): Promise<boolean> {
    const value = await this.redis.get(RESERVED_PREFIX + username);
    return value !== null;
  }

  async reserve(username: string): Promise<void> {
    const ttl = this.config.usernameReservationDays * DAY_IN_SECONDS;
    if (ttl <= 0) return;
    await this.redis.set(RESERVED_PREFIX + username, '1', 'EX', ttl);
  }
}
