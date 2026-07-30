import { ExecutionContext } from '@nestjs/common';
import { Store } from '../../domain/entities/store.aggregate';
import { StoreProfile } from '../../domain/value-objects/store-profile.vo';
import { Username } from '../../../../shared/kernel/value-objects/username.vo';
import { StoreRepository } from '../../domain/repositories/store.repository';
import { StoreOwnerGuard, RequestWithStore } from './store-owner.guard';

const makeStore = () =>
  Store.create({
    ownerId: 'owner-1',
    username: Username.create('tokosaya').unwrap(),
    profile: StoreProfile.create({ displayName: 'Toko Saya' }).unwrap(),
  });

class FakeStoreRepository implements StoreRepository {
  store: Store | null = null;

  findById(): Promise<Store | null> {
    return Promise.resolve(this.store);
  }

  findByUsername(): Promise<Store | null> {
    return Promise.resolve(this.store);
  }

  findByOwnerId(): Promise<Store | null> {
    return Promise.resolve(this.store);
  }

  existsByUsername(): Promise<boolean> {
    return Promise.resolve(false);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

const makeContext = (request: RequestWithStore): ExecutionContext => {
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  };
  return context as unknown as ExecutionContext;
};

describe('StoreOwnerGuard', () => {
  it('throws StoreNotFoundError when the caller has no store', async () => {
    const repo = new FakeStoreRepository();
    const guard = new StoreOwnerGuard(repo);
    const request: RequestWithStore = { user: { id: 'owner-1', email: 'a@b.com', role: 'seller' } } as never;

    await expect(guard.canActivate(makeContext(request))).rejects.toThrow('Store not found');
  });

  it('attaches request.store when a store is found', async () => {
    const repo = new FakeStoreRepository();
    repo.store = makeStore();
    const guard = new StoreOwnerGuard(repo);
    const request: RequestWithStore = { user: { id: 'owner-1', email: 'a@b.com', role: 'seller' } } as never;

    const result = await guard.canActivate(makeContext(request));

    expect(result).toBe(true);
    expect(request.store).toEqual({ id: repo.store.id, username: 'tokosaya' });
  });

  it('ignores a JWT storeId claim that disagrees with the resolved store', async () => {
    const repo = new FakeStoreRepository();
    repo.store = makeStore();
    const guard = new StoreOwnerGuard(repo);
    const request: RequestWithStore = {
      user: { id: 'owner-1', email: 'a@b.com', role: 'seller', storeId: 'stale-store-id' },
    } as never;

    await guard.canActivate(makeContext(request));

    expect(request.store?.id).toBe(repo.store.id);
    expect(request.store?.id).not.toBe('stale-store-id');
  });
});
