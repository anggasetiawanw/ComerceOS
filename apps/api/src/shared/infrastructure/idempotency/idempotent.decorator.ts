import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { IdempotencyInterceptor } from './idempotency.interceptor';

export const Idempotent = () => applyDecorators(UseInterceptors(IdempotencyInterceptor));
