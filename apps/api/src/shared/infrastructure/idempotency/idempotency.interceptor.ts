import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { from, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { RequestWithUser } from '../../presentation/guards/jwt-auth.guard';
import { IdempotencyService } from './idempotency.service';

const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly idempotency: IdempotencyService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse<Response>();

    const key = request.headers[IDEMPOTENCY_KEY_HEADER];
    if (typeof key !== 'string' || key.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (!request.user) {
      throw new Error('IdempotencyInterceptor used outside of an authenticated route');
    }

    const userId = request.user.id;
    const endpoint = `${request.method} ${request.path}`;
    const requestHash = IdempotencyService.hashBody(request.body);

    return from(this.idempotency.begin(key, userId, endpoint, requestHash)).pipe(
      switchMap((outcome) => {
        if (outcome.kind === 'replay') {
          response.status(outcome.status);
          return of(outcome.body);
        }

        return next.handle().pipe(
          tap((body: unknown) => {
            void this.idempotency.complete(outcome.recordId, response.statusCode, body);
          }),
        );
      }),
    );
  }
}
