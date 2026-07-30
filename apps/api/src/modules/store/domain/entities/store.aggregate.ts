import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { Username } from '../../../../shared/kernel/value-objects/username.vo';
import { StoreProfile } from '../value-objects/store-profile.vo';
import { StoreTheme } from '../value-objects/store-theme.vo';
import { StorePlan } from '../value-objects/store-plan.vo';
import { SettlementMode } from '../value-objects/settlement-mode.vo';
import { SocialPlatform } from '../value-objects/social-platform.vo';
import { SocialLink, SocialLinkError } from './social-link.entity';
import { StoreCreatedEvent } from '../events/store-created.event';
import { StoreProfileUpdatedEvent } from '../events/store-profile-updated.event';
import { StoreUsernameChangedEvent } from '../events/store-username-changed.event';
import { SettlementModeChangedEvent } from '../events/settlement-mode-changed.event';
import { StorePlanChangedEvent } from '../events/store-plan-changed.event';
import { StoreSocialLinksChangedEvent } from '../events/store-social-links-changed.event';
import {
  InvalidSocialLinkOrderError,
  SocialLinkLimitExceededError,
  SocialLinkNotFoundError,
} from '../errors/store.errors';

export const MAX_SOCIAL_LINKS = 10;

export interface StoreProps {
  ownerId: string;
  username: Username;
  profile: StoreProfile;
  theme: StoreTheme;
  customDomain: string | null;
  plan: StorePlan;
  settlementMode: SettlementMode;
  holdingBalance: Money;
  availableBalance: Money;
  invoiceCounter: number;
  socialLinks: SocialLink[];
  createdAt: Date;
}

export class Store extends AggregateRoot<StoreProps> {
  private constructor(props: StoreProps, id?: UniqueId) {
    super(props, id);
  }

  static create(params: { ownerId: string; username: Username; profile: StoreProfile }): Store {
    const store = new Store({
      ownerId: params.ownerId,
      username: params.username,
      profile: params.profile,
      theme: StoreTheme.empty(),
      customDomain: null,
      plan: StorePlan.free(),
      settlementMode: SettlementMode.auto(),
      holdingBalance: Money.zero(),
      availableBalance: Money.zero(),
      invoiceCounter: 0,
      socialLinks: [],
      createdAt: new Date(),
    });
    store.addDomainEvent(
      new StoreCreatedEvent(store.id, params.username.value, params.ownerId),
    );
    return store;
  }

  static reconstitute(props: StoreProps, id: UniqueId): Store {
    return new Store(props, id);
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get username(): Username {
    return this.props.username;
  }

  get profile(): StoreProfile {
    return this.props.profile;
  }

  get theme(): StoreTheme {
    return this.props.theme;
  }

  get customDomain(): string | null {
    return this.props.customDomain;
  }

  get plan(): StorePlan {
    return this.props.plan;
  }

  get settlementMode(): SettlementMode {
    return this.props.settlementMode;
  }

  get holdingBalance(): Money {
    return this.props.holdingBalance;
  }

  get availableBalance(): Money {
    return this.props.availableBalance;
  }

  get invoiceCounter(): number {
    return this.props.invoiceCounter;
  }

  get socialLinks(): readonly SocialLink[] {
    return this.props.socialLinks;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  updateProfile(profile: StoreProfile): void {
    this.props.profile = profile;
    this.addDomainEvent(new StoreProfileUpdatedEvent(this.id, this.props.username.value));
  }

  changeUsername(next: Username): void {
    if (next.value === this.props.username.value) return;
    const previous = this.props.username;
    this.props.username = next;
    this.addDomainEvent(new StoreUsernameChangedEvent(this.id, previous.value, next.value));
  }

  changeSettlementMode(mode: SettlementMode): void {
    if (mode.value === this.props.settlementMode.value) return;
    this.props.settlementMode = mode;
    this.addDomainEvent(new SettlementModeChangedEvent(this.id, mode.value));
  }

  changePlan(plan: StorePlan): void {
    if (plan.value === this.props.plan.value) return;
    this.props.plan = plan;
    this.addDomainEvent(new StorePlanChangedEvent(this.id, this.props.username.value, plan.value));
  }

  updateTheme(theme: StoreTheme): void {
    this.props.theme = theme;
  }

  addSocialLink(params: {
    platform: SocialPlatform;
    url: string;
  }): Result<SocialLink, SocialLinkError | SocialLinkLimitExceededError> {
    if (this.props.socialLinks.length >= MAX_SOCIAL_LINKS) {
      return Result.err(new SocialLinkLimitExceededError(MAX_SOCIAL_LINKS));
    }

    const linkResult = SocialLink.create({
      storeId: this.id,
      platform: params.platform,
      url: params.url,
      position: this.props.socialLinks.length,
    });
    if (linkResult.isErr()) return Result.err(linkResult.unwrapErr());

    const link = linkResult.unwrap();
    this.props.socialLinks = [...this.props.socialLinks, link];
    this.addDomainEvent(new StoreSocialLinksChangedEvent(this.id, this.props.username.value));
    return Result.ok(link);
  }

  updateSocialLink(
    id: string,
    params: { platform?: SocialPlatform; url?: string },
  ): Result<void, SocialLinkError | SocialLinkNotFoundError> {
    const link = this.props.socialLinks.find((candidate) => candidate.id === id);
    if (!link) return Result.err(new SocialLinkNotFoundError());

    const result = link.update(params);
    if (result.isErr()) return result;

    this.addDomainEvent(new StoreSocialLinksChangedEvent(this.id, this.props.username.value));
    return Result.ok(undefined);
  }

  removeSocialLink(id: string): Result<void, SocialLinkNotFoundError> {
    const exists = this.props.socialLinks.some((link) => link.id === id);
    if (!exists) return Result.err(new SocialLinkNotFoundError());

    this.props.socialLinks = this.props.socialLinks
      .filter((link) => link.id !== id)
      .map((link, index) => {
        link.changePosition(index);
        return link;
      });
    this.addDomainEvent(new StoreSocialLinksChangedEvent(this.id, this.props.username.value));
    return Result.ok(undefined);
  }

  reorderSocialLinks(orderedIds: string[]): Result<void, InvalidSocialLinkOrderError> {
    const currentIds = this.props.socialLinks.map((link) => link.id);
    const isPermutation =
      orderedIds.length === currentIds.length &&
      currentIds.every((id) => orderedIds.includes(id)) &&
      new Set(orderedIds).size === orderedIds.length;

    if (!isPermutation) {
      return Result.err(new InvalidSocialLinkOrderError());
    }

    const byId = new Map(this.props.socialLinks.map((link) => [link.id, link]));
    const nextLinks: SocialLink[] = [];
    orderedIds.forEach((id, index) => {
      const link = byId.get(id);
      if (link) {
        link.changePosition(index);
        nextLinks.push(link);
      }
    });

    this.props.socialLinks = nextLinks;
    this.addDomainEvent(new StoreSocialLinksChangedEvent(this.id, this.props.username.value));
    return Result.ok(undefined);
  }
}
