import { Store } from '../entities/store.aggregate';
import { StoreRepository } from '../repositories/store.repository';
import { UsernameAvailabilityService } from './username-availability.service';

class FakeStoreRepository implements StoreRepository {
  existing = new Set<string>();
  calls = 0;

  findById(): Promise<Store | null> {
    return Promise.resolve(null);
  }

  findByUsername(): Promise<Store | null> {
    return Promise.resolve(null);
  }

  findByOwnerId(): Promise<Store | null> {
    return Promise.resolve(null);
  }

  existsByUsername(username: string): Promise<boolean> {
    this.calls += 1;
    return Promise.resolve(this.existing.has(username));
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

describe('UsernameAvailabilityService', () => {
  it('returns unavailable with reason reserved and never touches the repository', async () => {
    const repo = new FakeStoreRepository();
    const service = new UsernameAvailabilityService(repo);

    const result = await service.check('admin');

    expect(result.isOk()).toBe(true);
    expect(result.unwrap()).toEqual({ available: false, reason: 'reserved' });
    expect(repo.calls).toBe(0);
  });

  it('returns unavailable with reason taken when the repository reports an existing store', async () => {
    const repo = new FakeStoreRepository();
    repo.existing.add('tokosaya');
    const service = new UsernameAvailabilityService(repo);

    const result = await service.check('TokoSaya');

    expect(result.unwrap()).toEqual({ available: false, reason: 'taken' });
  });

  it('returns available when free', async () => {
    const repo = new FakeStoreRepository();
    const service = new UsernameAvailabilityService(repo);

    const result = await service.check('tokobaru');

    expect(result.unwrap()).toEqual({ available: true });
  });

  it('returns a format error without touching the repository', async () => {
    const repo = new FakeStoreRepository();
    const service = new UsernameAvailabilityService(repo);

    const result = await service.check('ab');

    expect(result.isErr()).toBe(true);
    expect(repo.calls).toBe(0);
  });
});
