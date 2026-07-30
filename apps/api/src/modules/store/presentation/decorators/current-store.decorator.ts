import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentStorePayload, RequestWithStore } from '../guards/store-owner.guard';

export const CurrentStore = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentStorePayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithStore>();
    if (!request.store) {
      throw new Error('@CurrentStore() used outside of a StoreOwnerGuard-protected route');
    }
    return request.store;
  },
);
