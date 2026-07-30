import { of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Paginated } from '../dto/paginated.dto';
import { TransformInterceptor } from './transform.interceptor';

const context = {} as unknown as ExecutionContext;
const handlerReturning = (value: unknown): CallHandler => ({ handle: () => of(value) });

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps a plain value in { data }', (done) => {
    interceptor.intercept(context, handlerReturning({ id: '1' })).subscribe((result) => {
      expect(result).toEqual({ data: { id: '1' } });
      done();
    });
  });

  it('wraps null in { data: null }', (done) => {
    interceptor.intercept(context, handlerReturning(null)).subscribe((result) => {
      expect(result).toEqual({ data: null });
      done();
    });
  });

  it('splits a Paginated result into { data, meta }', (done) => {
    const paginated = Paginated.of([{ id: '1' }, { id: '2' }], { page: 1, limit: 20, total: 2 });

    interceptor.intercept(context, handlerReturning(paginated)).subscribe((result) => {
      expect(result).toEqual({
        data: [{ id: '1' }, { id: '2' }],
        meta: { page: 1, limit: 20, total: 2, hasMore: false },
      });
      done();
    });
  });

  it('computes hasMore correctly when more pages remain', (done) => {
    const paginated = Paginated.of([{ id: '1' }], { page: 1, limit: 1, total: 3 });

    interceptor.intercept(context, handlerReturning(paginated)).subscribe((result) => {
      expect(result).toEqual({
        data: [{ id: '1' }],
        meta: { page: 1, limit: 1, total: 3, hasMore: true },
      });
      done();
    });
  });
});
