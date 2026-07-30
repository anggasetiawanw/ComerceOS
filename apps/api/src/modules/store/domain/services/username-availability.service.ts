import { Result } from '../../../../shared/kernel/result';
import { Username, UsernameError } from '../../../../shared/kernel/value-objects/username.vo';
import { StoreRepository } from '../repositories/store.repository';

export interface UsernameAvailability {
  available: boolean;
  reason?: 'reserved' | 'taken';
}

export class UsernameAvailabilityService {
  constructor(private readonly stores: StoreRepository) {}

  async check(raw: string): Promise<Result<UsernameAvailability, UsernameError>> {
    const usernameResult = Username.create(raw);
    if (usernameResult.isErr()) {
      const error = usernameResult.unwrapErr();
      if (error.reason === 'reserved') {
        return Result.ok({ available: false, reason: 'reserved' });
      }
      return Result.err(error);
    }

    const exists = await this.stores.existsByUsername(usernameResult.unwrap().value);
    return Result.ok(exists ? { available: false, reason: 'taken' } : { available: true });
  }
}
