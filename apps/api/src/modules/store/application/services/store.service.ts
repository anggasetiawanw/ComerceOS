import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { Username, UsernameError } from '../../../../shared/kernel/value-objects/username.vo';
import { Store } from '../../domain/entities/store.aggregate';
import { StoreProfile, StoreProfileError } from '../../domain/value-objects/store-profile.vo';
import { STORE_REPOSITORY, StoreRepository } from '../../domain/repositories/store.repository';
import {
  UsernameAvailability,
  UsernameAvailabilityService,
} from '../../domain/services/username-availability.service';
import {
  InvalidUsernameError,
  StoreAlreadyExistsError,
  StoreNotFoundError,
  UsernameChangeCooldownError,
  UsernameReservedError,
  UsernameTakenError,
} from '../../domain/errors/store.errors';
import {
  USERNAME_RESERVATION_STORE,
  UsernameReservationStore,
} from '../ports/username-reservation-store.port';

type CreateStoreError = StoreAlreadyExistsError | InvalidUsernameError | UsernameReservedError | UsernameTakenError;
type UpdateProfileError = StoreNotFoundError | StoreProfileError;
type ChangeUsernameError =
  | StoreNotFoundError
  | UsernameChangeCooldownError
  | InvalidUsernameError
  | UsernameReservedError
  | UsernameTakenError;

@Injectable()
export class StoreService {
  constructor(
    @Inject(STORE_REPOSITORY) private readonly stores: StoreRepository,
    @Inject(USERNAME_RESERVATION_STORE) private readonly usernameReservations: UsernameReservationStore,
    private readonly usernameAvailability: UsernameAvailabilityService,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
  ) {}

  async checkUsernameAvailability(raw: string): Promise<Result<UsernameAvailability, UsernameError>> {
    const domainResult = await this.usernameAvailability.check(raw);
    if (domainResult.isErr()) return domainResult;

    const availability = domainResult.unwrap();
    if (!availability.available) return domainResult;

    const usernameResult = Username.create(raw);
    if (usernameResult.isErr()) return Result.err(usernameResult.unwrapErr());

    const reserved = await this.usernameReservations.isReserved(usernameResult.unwrap().value);
    return reserved ? Result.ok({ available: false, reason: 'taken' }) : domainResult;
  }

  async createStore(params: {
    ownerId: string;
    username: string;
    displayName?: string;
  }): Promise<Result<Store, CreateStoreError>> {
    const existingStore = await this.stores.findByOwnerId(params.ownerId);
    if (existingStore) return Result.err(new StoreAlreadyExistsError());

    const usernameResult = Username.create(params.username);
    if (usernameResult.isErr()) {
      const error = usernameResult.unwrapErr();
      return Result.err(
        error.reason === 'reserved'
          ? new UsernameReservedError(params.username)
          : new InvalidUsernameError(error.message),
      );
    }
    const username = usernameResult.unwrap();

    const exists = await this.stores.existsByUsername(username.value);
    if (exists) return Result.err(new UsernameTakenError(username.value));

    const reserved = await this.usernameReservations.isReserved(username.value);
    if (reserved) return Result.err(new UsernameTakenError(username.value));

    const profile = StoreProfile.create({ displayName: params.displayName ?? username.value }).unwrap();
    const store = Store.create({ ownerId: params.ownerId, username, profile });

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok(store);
  }

  async getMyStore(ownerId: string): Promise<Store | null> {
    return this.stores.findByOwnerId(ownerId);
  }

  async updateProfile(
    ownerId: string,
    params: {
      displayName?: string;
      bio?: string | null;
      avatarUrl?: string | null;
      bannerUrl?: string | null;
    },
  ): Promise<Result<Store, UpdateProfileError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    const profileResult = StoreProfile.create({
      displayName: params.displayName ?? store.profile.displayName,
      bio: params.bio === undefined ? store.profile.bio : params.bio,
      avatarUrl: params.avatarUrl === undefined ? store.profile.avatarUrl : params.avatarUrl,
      bannerUrl: params.bannerUrl === undefined ? store.profile.bannerUrl : params.bannerUrl,
    });
    if (profileResult.isErr()) return Result.err(profileResult.unwrapErr());

    store.updateProfile(profileResult.unwrap());

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    return Result.ok(store);
  }

  async changeUsername(ownerId: string, raw: string): Promise<Result<Store, ChangeUsernameError>> {
    const store = await this.stores.findByOwnerId(ownerId);
    if (!store) return Result.err(new StoreNotFoundError());

    const onCooldown = await this.usernameReservations.isOnCooldown(store.id);
    if (onCooldown) return Result.err(new UsernameChangeCooldownError());

    const usernameResult = Username.create(raw);
    if (usernameResult.isErr()) {
      const error = usernameResult.unwrapErr();
      return Result.err(
        error.reason === 'reserved' ? new UsernameReservedError(raw) : new InvalidUsernameError(error.message),
      );
    }
    const nextUsername = usernameResult.unwrap();
    const previousUsername = store.username.value;

    if (nextUsername.value !== previousUsername) {
      const exists = await this.stores.existsByUsername(nextUsername.value);
      if (exists) return Result.err(new UsernameTakenError(nextUsername.value));

      const reserved = await this.usernameReservations.isReserved(nextUsername.value);
      if (reserved) return Result.err(new UsernameTakenError(nextUsername.value));
    }

    store.changeUsername(nextUsername);

    await this.transactionManager.runInTransaction(() => this.stores.save(store));
    await this.events.publishAll(store.pullDomainEvents());

    if (nextUsername.value !== previousUsername) {
      await this.usernameReservations.startCooldown(store.id);
      await this.usernameReservations.reserve(previousUsername);
    }

    return Result.ok(store);
  }
}
