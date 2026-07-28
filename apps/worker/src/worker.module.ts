import { Module } from '@nestjs/common';
import { AppConfigModule } from './shared/config/app-config.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { RedisModule } from './shared/infrastructure/redis/redis.module';

@Module({
  imports: [AppConfigModule, PrismaModule, RedisModule],
})
export class WorkerModule {}
