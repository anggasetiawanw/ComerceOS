import { Username } from '../../../../shared/kernel/value-objects/username.vo';
import { StoreProfile } from '../value-objects/store-profile.vo';
import { SettlementMode } from '../value-objects/settlement-mode.vo';
import { StorePlan } from '../value-objects/store-plan.vo';
import { SocialPlatform } from '../value-objects/social-platform.vo';
import { MAX_SOCIAL_LINKS, Store } from './store.aggregate';

const username = (value: string) => Username.create(value).unwrap();
const profile = (displayName = 'Toko Saya') => StoreProfile.create({ displayName }).unwrap();
const instagram = SocialPlatform.create('instagram').unwrap();

const createStore = () =>
  Store.create({ ownerId: 'owner-1', username: username('tokosaya'), profile: profile() });

describe('Store aggregate', () => {
  it('create seeds free/auto/zero balances/0 invoice counter and emits StoreCreated', () => {
    const store = createStore();

    expect(store.plan.value).toBe('free');
    expect(store.settlementMode.value).toBe('auto');
    expect(store.holdingBalance.isZero()).toBe(true);
    expect(store.availableBalance.isZero()).toBe(true);
    expect(store.invoiceCounter).toBe(0);

    const events = store.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events.at(0)?.eventName).toBe('store.created');
  });

  it('changeUsername to the same value emits nothing', () => {
    const store = createStore();
    store.pullDomainEvents();

    store.changeUsername(username('tokosaya'));

    expect(store.pullDomainEvents()).toHaveLength(0);
  });

  it('changeUsername to a new value carries the previous username', () => {
    const store = createStore();
    store.pullDomainEvents();

    store.changeUsername(username('tokobaru'));

    const events = store.pullDomainEvents();
    expect(events).toHaveLength(1);
    const event = events[0] as unknown as { previousUsername: string; newUsername: string };
    expect(event.previousUsername).toBe('tokosaya');
    expect(event.newUsername).toBe('tokobaru');
    expect(store.username.value).toBe('tokobaru');
  });

  it('updateProfile emits', () => {
    const store = createStore();
    store.pullDomainEvents();

    store.updateProfile(profile('Toko Baru'));

    expect(store.profile.displayName).toBe('Toko Baru');
    expect(store.pullDomainEvents()).toHaveLength(1);
  });

  it('changeSettlementMode emits only on an actual change', () => {
    const store = createStore();
    store.pullDomainEvents();

    store.changeSettlementMode(SettlementMode.auto());
    expect(store.pullDomainEvents()).toHaveLength(0);

    store.changeSettlementMode(SettlementMode.manual());
    expect(store.pullDomainEvents()).toHaveLength(1);
    expect(store.settlementMode.value).toBe('manual');
  });

  it('changePlan emits only on an actual change', () => {
    const store = createStore();
    store.pullDomainEvents();

    store.changePlan(StorePlan.free());
    expect(store.pullDomainEvents()).toHaveLength(0);

    store.changePlan(StorePlan.create('pro').unwrap());
    expect(store.pullDomainEvents()).toHaveLength(1);
    expect(store.plan.value).toBe('pro');
  });

  it('balances survive every mutator', () => {
    const store = createStore();
    store.updateProfile(profile('New Name'));
    store.changeUsername(username('tokobaru'));
    store.changeSettlementMode(SettlementMode.manual());
    store.addSocialLink({ platform: instagram, url: 'https://instagram.com/tokosaya' });

    expect(store.holdingBalance.isZero()).toBe(true);
    expect(store.availableBalance.isZero()).toBe(true);
  });

  describe('social links', () => {
    it('adds a social link at the next position', () => {
      const store = createStore();
      const result = store.addSocialLink({
        platform: instagram,
        url: 'https://instagram.com/tokosaya',
      });
      expect(result.isOk()).toBe(true);
      expect(result.unwrap().position).toBe(0);
      expect(store.socialLinks).toHaveLength(1);
    });

    it('updates an existing social link', () => {
      const store = createStore();
      const link = store.addSocialLink({
        platform: instagram,
        url: 'https://instagram.com/tokosaya',
      }).unwrap();

      const result = store.updateSocialLink(link.id, { url: 'https://instagram.com/tokobaru' });

      expect(result.isOk()).toBe(true);
      expect(store.socialLinks.at(0)?.url).toBe('https://instagram.com/tokobaru');
    });

    it('returns not found when updating an unknown social link', () => {
      const store = createStore();
      const result = store.updateSocialLink('unknown-id', { url: 'https://instagram.com/x' });
      expect(result.isErr()).toBe(true);
    });

    it('removes a social link and re-densifies positions', () => {
      const store = createStore();
      const first = store.addSocialLink({
        platform: instagram,
        url: 'https://instagram.com/a',
      }).unwrap();
      store.addSocialLink({ platform: instagram, url: 'https://instagram.com/b' });
      const third = store.addSocialLink({
        platform: instagram,
        url: 'https://instagram.com/c',
      }).unwrap();

      store.removeSocialLink(first.id);

      expect(store.socialLinks).toHaveLength(2);
      expect(store.socialLinks.map((link) => link.id)).toEqual(
        expect.arrayContaining([third.id]),
      );
      expect(store.socialLinks.at(0)?.position).toBe(0);
      expect(store.socialLinks.at(1)?.position).toBe(1);
    });

    it('remove of an unknown id returns Err', () => {
      const store = createStore();
      const result = store.removeSocialLink('unknown-id');
      expect(result.isErr()).toBe(true);
    });

    it('reorder produces a dense 0..n-1 sequence', () => {
      const store = createStore();
      const a = store.addSocialLink({ platform: instagram, url: 'https://instagram.com/a' }).unwrap();
      const b = store.addSocialLink({ platform: instagram, url: 'https://instagram.com/b' }).unwrap();
      const c = store.addSocialLink({ platform: instagram, url: 'https://instagram.com/c' }).unwrap();

      const result = store.reorderSocialLinks([c.id, a.id, b.id]);

      expect(result.isOk()).toBe(true);
      expect(store.socialLinks.map((link) => link.id)).toEqual([c.id, a.id, b.id]);
      expect(store.socialLinks.map((link) => link.position)).toEqual([0, 1, 2]);
    });

    it('reorder rejects anything that is not an exact permutation', () => {
      const store = createStore();
      const a = store.addSocialLink({ platform: instagram, url: 'https://instagram.com/a' }).unwrap();
      store.addSocialLink({ platform: instagram, url: 'https://instagram.com/b' });

      const missingOne = store.reorderSocialLinks([a.id]);
      expect(missingOne.isErr()).toBe(true);

      const duplicate = store.reorderSocialLinks([a.id, a.id]);
      expect(duplicate.isErr()).toBe(true);

      const unknownId = store.reorderSocialLinks([a.id, 'unknown-id']);
      expect(unknownId.isErr()).toBe(true);
    });

    it('rejects adding past the MAX_SOCIAL_LINKS cap', () => {
      const store = createStore();
      for (let i = 0; i < MAX_SOCIAL_LINKS; i += 1) {
        const result = store.addSocialLink({
          platform: instagram,
          url: `https://instagram.com/link${i}`,
        });
        expect(result.isOk()).toBe(true);
      }

      const overCap = store.addSocialLink({
        platform: instagram,
        url: 'https://instagram.com/onemore',
      });
      expect(overCap.isErr()).toBe(true);
    });
  });
});
