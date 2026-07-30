import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { RequestWithUser } from '../../../../shared/presentation/guards/jwt-auth.guard';
import { STORE_REPOSITORY, StoreRepository } from '../../domain/repositories/store.repository';
import { StoreNotFoundError } from '../../domain/errors/store.errors';

export interface CurrentStorePayload {
  id: string;
  username: string;
}

export interface RequestWithStore extends RequestWithUser {
  store?: CurrentStorePayload;
}

@Injectable()
export class StoreOwnerGuard implements CanActivate {
  private readonly logger = new Logger(StoreOwnerGuard.name);

  constructor(@Inject(STORE_REPOSITORY) private readonly stores: StoreRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithStore>();
    const user = request.user;
    if (!user) {
      throw new Error('StoreOwnerGuard used outside of an authenticated route');
    }

    const store = await this.stores.findByOwnerId(user.id);
    if (!store) {
      throw new StoreNotFoundError();
    }

    if (user.storeId && user.storeId !== store.id) {
      this.logger.warn(
        `JWT storeId claim "${user.storeId}" does not match the resolved store "${store.id}" for user "${user.id}"; using the database value`,
      );
    }

    request.store = { id: store.id, username: store.username.value };
    return true;
  }
}
