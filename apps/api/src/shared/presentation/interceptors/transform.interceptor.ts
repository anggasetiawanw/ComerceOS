import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Paginated, PaginationMeta } from '../dto/paginated.dto';

interface Envelope {
  data: unknown;
  meta?: PaginationMeta;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor<unknown, Envelope> {
  intercept(_context: ExecutionContext, next: CallHandler<unknown>): Observable<Envelope> {
    return next.handle().pipe(
      map((data) => (data instanceof Paginated ? { data: data.items, meta: data.meta } : { data })),
    );
  }
}
