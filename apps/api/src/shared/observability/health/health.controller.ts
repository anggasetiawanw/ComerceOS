import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../../presentation/decorators/public.decorator';
import { PrismaHealthIndicator } from './prisma.health-indicator';
import { RedisHealthIndicator } from './redis.health-indicator';
import { StorageHealthIndicator } from './storage.health-indicator';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly storageIndicator: StorageHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('postgres'),
      () => this.redisIndicator.isHealthy('redis'),
      () => this.storageIndicator.isHealthy('storage'),
    ]);
  }
}
