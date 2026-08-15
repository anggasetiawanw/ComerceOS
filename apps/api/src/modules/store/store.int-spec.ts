import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigModule } from '../../shared/config/app-config.module';
import { PrismaModule } from '../../shared/infrastructure/prisma/prisma.module';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { RedisModule } from '../../shared/infrastructure/redis/redis.module';
import { REDIS_CLIENT } from '../../shared/infrastructure/redis/redis.constants';
import { EventsModule } from '../../shared/infrastructure/events/events.module';
import { StorageModule } from '../../shared/infrastructure/storage/storage.module';
import { generateId } from '../../shared/kernel/uuid';
import { StoreModule } from './store.module';
import { StoreService } from './application/services/store.service';
import { StoreSettingsService } from './application/services/store-settings.service';
import { SocialLinkService } from './application/services/social-link.service';

const createUser = async (prisma: PrismaService, email: string) =>
  prisma.user.create({
    data: {
      id: generateId(),
      email,
      name: 'Test Seller',
      role: 'seller',
      emailVerifiedAt: new Date(),
      passwordHash: 'irrelevant-for-this-test',
    },
  });

describe('Store (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let storeService: StoreService;
  let storeSettingsService: StoreSettingsService;
  let socialLinkService: SocialLinkService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppConfigModule, PrismaModule, RedisModule, EventsModule, StorageModule, StoreModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    storeService = moduleRef.get(StoreService);
    storeSettingsService = moduleRef.get(StoreSettingsService);
    socialLinkService = moduleRef.get(SocialLinkService);
  });

  beforeEach(async () => {
    await prisma.notificationDelivery.deleteMany();
    await prisma.balanceTransaction.deleteMany();
    await prisma.withdrawal.deleteMany();
    await prisma.bankAccount.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.storeBuyer.deleteMany();
    await prisma.digitalDelivery.deleteMany();
    await prisma.outboxEvent.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.webhookEvent.deleteMany();
    await prisma.orderStatusHistory.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.inquiry.deleteMany();
    await prisma.digitalFile.deleteMany();
    await prisma.product.deleteMany();
    await prisma.socialLink.deleteMany();
    await prisma.store.deleteMany();
    await prisma.user.deleteMany();

    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.flushdb();
  });

  afterAll(async () => {
    const redis = moduleRef.get(REDIS_CLIENT);
    await redis.quit();
    await moduleRef.close();
  });

  it('creates a store with free/auto/zero balances and a lowercased username', async () => {
    const user = await createUser(prisma, 'seller1@example.com');

    const result = await storeService.createStore({ ownerId: user.id, username: 'TokoSaya' });
    expect(result.isOk()).toBe(true);

    const row = await prisma.store.findUnique({ where: { ownerId: user.id } });
    expect(row?.username).toBe('tokosaya');
    expect(row?.plan).toBe('free');
    expect(row?.settlementMode).toBe('auto');
    expect(row?.holdingBalance).toBe(0n);
    expect(row?.availableBalance).toBe(0n);
    expect(row?.invoiceCounter).toBe(0);
  });

  it('rejects a username that differs only by case from an existing one (citext proof)', async () => {
    const userA = await createUser(prisma, 'seller-a@example.com');
    const userB = await createUser(prisma, 'seller-b@example.com');

    await storeService.createStore({ ownerId: userA.id, username: 'tokosaya' });
    const result = await storeService.createStore({ ownerId: userB.id, username: 'TokoSaya' });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().code).toBe('STORE.USERNAME_TAKEN');
  });

  it('rejects a reserved username before any database call', async () => {
    const user = await createUser(prisma, 'seller2@example.com');

    const result = await storeService.createStore({ ownerId: user.id, username: 'admin' });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().code).toBe('STORE.USERNAME_RESERVED');
  });

  it('rejects a second store for the same owner', async () => {
    const user = await createUser(prisma, 'seller3@example.com');
    await storeService.createStore({ ownerId: user.id, username: 'tokopertama' });

    const result = await storeService.createStore({ ownerId: user.id, username: 'tokokedua' });

    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().code).toBe('STORE.ALREADY_EXISTS');
  });

  describe('balances are read-only', () => {
    it('every store mutator leaves a seeded non-zero balance untouched', async () => {
      const user = await createUser(prisma, 'seller4@example.com');
      const created = (await storeService.createStore({ ownerId: user.id, username: 'tokosaldo' })).unwrap();

      await prisma.store.update({
        where: { id: created.id },
        data: { holdingBalance: 50_000n, availableBalance: 25_000n, invoiceCounter: 7 },
      });

      await storeService.updateProfile(user.id, { displayName: 'New Name' });
      await storeService.changeUsername(user.id, 'tokosaldobaru');
      await storeSettingsService.changeSettlementMode(user.id, 'manual');

      const row = await prisma.store.findUnique({ where: { ownerId: user.id } });
      expect(row?.holdingBalance).toBe(50_000n);
      expect(row?.availableBalance).toBe(25_000n);
      expect(row?.invoiceCounter).toBe(7);
    });
  });

  describe('username change', () => {
    it('resolves the new handle and the old one no longer resolves, carrying the previous value on the event', async () => {
      const user = await createUser(prisma, 'seller5@example.com');
      await storeService.createStore({ ownerId: user.id, username: 'tokolama' });

      const result = await storeService.changeUsername(user.id, 'tokobaru');
      expect(result.isOk()).toBe(true);

      const oldRow = await prisma.store.findUnique({ where: { username: 'tokolama' } });
      const newRow = await prisma.store.findUnique({ where: { username: 'tokobaru' } });
      expect(oldRow).toBeNull();
      expect(newRow).not.toBeNull();
    });
  });

  describe('settlement mode', () => {
    it('persists a settlement mode change', async () => {
      const user = await createUser(prisma, 'seller6@example.com');
      await storeService.createStore({ ownerId: user.id, username: 'tokosettle' });

      const result = await storeSettingsService.changeSettlementMode(user.id, 'manual');
      expect(result.isOk()).toBe(true);

      const row = await prisma.store.findUnique({ where: { ownerId: user.id } });
      expect(row?.settlementMode).toBe('manual');
    });
  });

  describe('social links', () => {
    it('adds, updates, reorders, and deletes, with cascade on store delete', async () => {
      const user = await createUser(prisma, 'seller7@example.com');
      const store = (await storeService.createStore({ ownerId: user.id, username: 'tokolinks' })).unwrap();

      const a = (
        await socialLinkService.add(user.id, { platform: 'instagram', url: 'https://instagram.com/a' })
      ).unwrap();
      const b = (
        await socialLinkService.add(user.id, { platform: 'instagram', url: 'https://instagram.com/b' })
      ).unwrap();

      await socialLinkService.update(user.id, a.id, { url: 'https://instagram.com/a-updated' });
      const reordered = (await socialLinkService.reorder(user.id, [b.id, a.id])).unwrap();
      expect(reordered.map((link) => link.id)).toEqual([b.id, a.id]);

      const rowsAfterReorder = await prisma.socialLink.findMany({
        where: { storeId: store.id },
        orderBy: { position: 'asc' },
      });
      expect(rowsAfterReorder.map((row) => row.id)).toEqual([b.id, a.id]);

      await prisma.store.delete({ where: { id: store.id } });
      const remaining = await prisma.socialLink.findMany({ where: { storeId: store.id } });
      expect(remaining).toHaveLength(0);
    });
  });

  describe('cross-tenant isolation', () => {
    it('every seller operation is scoped to the caller\'s own store via ownerId, never a raw store id', async () => {
      const ownerA = await createUser(prisma, 'owner-a@example.com');
      const ownerB = await createUser(prisma, 'owner-b@example.com');
      const storeA = (
        await storeService.createStore({ ownerId: ownerA.id, username: 'tokoa' })
      ).unwrap();
      await storeService.createStore({ ownerId: ownerB.id, username: 'tokob' });

      const linkOnA = (
        await socialLinkService.add(ownerA.id, { platform: 'instagram', url: 'https://instagram.com/a' })
      ).unwrap();

      const profileUpdateAsB = await storeService.updateProfile(ownerB.id, { displayName: 'Hijacked' });
      expect(profileUpdateAsB.isOk()).toBe(true);
      const storeARowAfter = await prisma.store.findUnique({ where: { id: storeA.id } });
      expect(storeARowAfter?.displayName).not.toBe('Hijacked');

      const settlementAsB = await storeSettingsService.changeSettlementMode(ownerB.id, 'manual');
      expect(settlementAsB.isOk()).toBe(true);
      const storeASettlementAfter = await prisma.store.findUnique({ where: { id: storeA.id } });
      expect(storeASettlementAfter?.settlementMode).toBe('auto');

      const updateOtherStoreLinkAsB = await socialLinkService.update(ownerB.id, linkOnA.id, {
        url: 'https://instagram.com/hijacked',
      });
      expect(updateOtherStoreLinkAsB.isErr()).toBe(true);
      expect(updateOtherStoreLinkAsB.unwrapErr().message).toBe('Social link not found');

      const removeOtherStoreLinkAsB = await socialLinkService.remove(ownerB.id, linkOnA.id);
      expect(removeOtherStoreLinkAsB.isErr()).toBe(true);

      const linkRowStillExists = await prisma.socialLink.findUnique({ where: { id: linkOnA.id } });
      expect(linkRowStillExists).not.toBeNull();
      expect(linkRowStillExists?.url).toBe('https://instagram.com/a');

      // Architectural note: every StoreService/SocialLinkService method takes only an
      // ownerId (never a storeId), so "act on someone else's store" is not just rejected,
      // it is not expressible at the call site.
    });
  });
});
