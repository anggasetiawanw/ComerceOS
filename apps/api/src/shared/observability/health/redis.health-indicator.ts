import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';

@Injectable()
export class RedisHealthIndicator {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error(`Unexpected PING reply: ${pong}`);
      }
      return { [key]: { status: 'up' } };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError('Redis check failed', {
        [key]: { status: 'down', message },
      });
    }
  }
}
