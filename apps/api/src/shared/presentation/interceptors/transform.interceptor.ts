import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Paginated, PaginationMeta } from '../dto/paginated.dto';
import { CursorMeta, CursorPaginated } from '../dto/cursor-paginated.dto';

interface Envelope {
  data: unknown;
  meta?: PaginationMeta | CursorMeta;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor<unknown, Envelope> {
  intercept(_context: ExecutionContext, next: CallHandler<unknown>): Observable<Envelope> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof Paginated) return { data: data.items, meta: data.meta };
        if (data instanceof CursorPaginated) return { data: data.items, meta: data.meta };
        return { data };
      }),
    );
  }
}
