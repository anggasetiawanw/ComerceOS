import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

const bootstrap = async (): Promise<void> => {
  await NestFactory.createApplicationContext(WorkerModule);

  const logger = new Logger('Worker');
  logger.log('Worker ready — Postgres and Redis connected, no consumers registered yet');
};

bootstrap();
