import { Prisma, SocialLink as PrismaSocialLink, Store as PrismaStore } from '@prisma/client';
import { Store } from '../../domain/entities/store.aggregate';
import { Username } from '../../../../shared/kernel/value-objects/username.vo';
import { Phone } from '../../../../shared/kernel/value-objects/phone.vo';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { StoreProfile } from '../../domain/value-objects/store-profile.vo';
import { StoreTheme } from '../../domain/value-objects/store-theme.vo';
import { StorePlan } from '../../domain/value-objects/store-plan.vo';
import { SettlementMode } from '../../domain/value-objects/settlement-mode.vo';
import { SocialLinkMapper } from './social-link.mapper';

export type PrismaStoreWithLinks = PrismaStore & { socialLinks: PrismaSocialLink[] };

export class StoreMapper {
  static toDomain(row: PrismaStoreWithLinks): Store {
    const usernameResult = Username.create(row.username);
    if (usernameResult.isErr()) {
      throw new Error(`Corrupt store row: invalid username "${row.username}"`);
    }

    const profileResult = StoreProfile.create({
      displayName: row.displayName,
      bio: row.bio,
      avatarUrl: row.avatarUrl,
      bannerUrl: row.bannerUrl,
    });
    if (profileResult.isErr()) {
      throw new Error(`Corrupt store row: invalid profile for store "${row.id}"`);
    }

    const themeResult = StoreTheme.create(row.theme);
    if (themeResult.isErr()) {
      throw new Error(`Corrupt store row: invalid theme for store "${row.id}"`);
    }

    const planResult = StorePlan.create(row.plan);
    if (planResult.isErr()) {
      throw new Error(`Corrupt store row: invalid plan "${row.plan}"`);
    }

    const modeResult = SettlementMode.create(row.settlementMode);
    if (modeResult.isErr()) {
      throw new Error(`Corrupt store row: invalid settlement mode "${row.settlementMode}"`);
    }

    let whatsappNumber: Phone | null = null;
    if (row.whatsappNumber !== null) {
      const phoneResult = Phone.create(row.whatsappNumber);
      if (phoneResult.isErr()) {
        throw new Error(`Corrupt store row: invalid whatsapp number for store "${row.id}"`);
      }
      whatsappNumber = phoneResult.unwrap();
    }

    const holdingBalanceResult = Money.fromRupiah(row.holdingBalance);
    if (holdingBalanceResult.isErr()) {
      throw new Error(`Corrupt store row: invalid holding balance for store "${row.id}"`);
    }

    const availableBalanceResult = Money.fromRupiah(row.availableBalance);
    if (availableBalanceResult.isErr()) {
      throw new Error(`Corrupt store row: invalid available balance for store "${row.id}"`);
    }

    const socialLinks = row.socialLinks
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((link) => SocialLinkMapper.toDomain(link));

    return Store.reconstitute(
      {
        ownerId: row.ownerId,
        username: usernameResult.unwrap(),
        profile: profileResult.unwrap(),
        theme: themeResult.unwrap(),
        customDomain: row.customDomain,
        plan: planResult.unwrap(),
        settlementMode: modeResult.unwrap(),
        whatsappNumber,
        holdingBalance: holdingBalanceResult.unwrap(),
        availableBalance: availableBalanceResult.unwrap(),
        invoiceCounter: row.invoiceCounter,
        socialLinks,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(store: Store): Prisma.StoreUncheckedCreateInput {
    const theme = store.theme.value;
    return {
      id: store.id,
      ownerId: store.ownerId,
      username: store.username.value,
      displayName: store.profile.displayName,
      bio: store.profile.bio,
      avatarUrl: store.profile.avatarUrl,
      bannerUrl: store.profile.bannerUrl,
      theme: theme === null ? Prisma.JsonNull : { ...theme },
      customDomain: store.customDomain,
      plan: store.plan.value,
      settlementMode: store.settlementMode.value,
      whatsappNumber: store.whatsappNumber?.value ?? null,
      holdingBalance: store.holdingBalance.amount,
      availableBalance: store.availableBalance.amount,
      invoiceCounter: store.invoiceCounter,
      createdAt: store.createdAt,
    };
  }

  static toPersistenceUpdate(store: Store): Prisma.StoreUncheckedUpdateInput {
    const theme = store.theme.value;
    return {
      username: store.username.value,
      displayName: store.profile.displayName,
      bio: store.profile.bio,
      avatarUrl: store.profile.avatarUrl,
      bannerUrl: store.profile.bannerUrl,
      theme: theme === null ? Prisma.JsonNull : { ...theme },
      plan: store.plan.value,
      settlementMode: store.settlementMode.value,
      whatsappNumber: store.whatsappNumber?.value ?? null,
    };
  }
}
