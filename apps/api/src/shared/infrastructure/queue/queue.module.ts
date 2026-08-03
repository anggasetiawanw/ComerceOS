import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';
import { AppConfigService } from '../../config/app-config.service';
import { AppConfigModule } from '../../config/app-config.module';
import { QUEUE_NAMES } from './queue.constants';

// BullMQ requires maxRetriesPerRequest: null on its Redis connection — the
// shared REDIS_CLIENT (maxRetriesPerRequest: 3, used for cache/rate-limit)
// cannot be reused here, so this is a second, dedicated ioredis connection.
@Global()
@Module({
  imports: [
    AppConfigModule,
    BullModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: new Redis(config.redisUrl, { maxRetriesPerRequest: null }),
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.PAYMENT },
      { name: QUEUE_NAMES.ORDER },
      { name: QUEUE_NAMES.OUTBOX },
      { name: QUEUE_NAMES.DELIVERY },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
