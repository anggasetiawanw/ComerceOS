import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger as NestLogger } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { WorkerModule } from './worker.module';
import { AppConfigService } from './shared/config/app-config.service';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.createApplicationContext(WorkerModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const logger = new NestLogger('Worker');
  const config = app.get(AppConfigService);

  logger.log('Worker ready — outbox relay, payment/order/delivery job consumers registered');
  if (!config.isMidtransConfigured && !config.isProduction) {
    logger.warn('MIDTRANS_SERVER_KEY/CLIENT_KEY are blank — using the stub Snap gateway');
  }
  if (config.midtransNgrokDev) {
    logger.log(`Paste this webhook URL into the Midtrans dashboard: ${config.midtransNgrokDev}/api/v1/payments/midtrans/webhook`);
  }
};

bootstrap();
