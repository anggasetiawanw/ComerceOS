import { Module } from '@nestjs/common';
import { AppConfigModule } from './shared/config/app-config.module';
import { LoggerModule } from './shared/observability/logger.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { RedisModule } from './shared/infrastructure/redis/redis.module';
import { HealthModule } from './shared/observability/health/health.module';

@Module({
  imports: [AppConfigModule, LoggerModule, PrismaModule, RedisModule, HealthModule],
})
export class AppModule {}
