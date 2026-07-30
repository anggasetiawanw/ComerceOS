import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from '../config/app-config.module';
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        {
          name: 'default',
          ttl: config.generalThrottleTtlSeconds * 1000,
          limit: config.generalThrottleLimit,
        },
      ],
    }),
  ],
  exports: [ThrottlerModule],
})
export class AppThrottlerModule {}
