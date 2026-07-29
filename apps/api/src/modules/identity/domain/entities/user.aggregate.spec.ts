import { User } from './user.aggregate';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';

const email = (value = 'buyer@example.com') => Email.create(value).unwrap();

const registerWithPassword = async () => {
  const passwordHash = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();
  return User.registerWithPassword({ email: email(), passwordHash, name: 'Buyer' });
};

describe('User', () => {
  describe('registerFromGoogle', () => {
    it('is verified immediately and has no password', () => {
      const user = User.registerFromGoogle({
        googleId: 'google-1',
        email: email(),
        name: 'Buyer',
        avatarUrl: null,
      });

      expect(user.isEmailVerified()).toBe(true);
      expect(user.passwordHash).toBeNull();
      expect(user.canLoginWithPassword()).toBe(false);
    });

    it('raises UserRegistered', () => {
      const user = User.registerFromGoogle({
        googleId: 'google-1',
        email: email(),
        name: 'Buyer',
        avatarUrl: null,
      });

      const events = user.pullDomainEvents();
      expect(events.map((e) => e.eventName)).toContain('identity.user_registered');
    });
  });

  describe('registerWithPassword', () => {
    it('starts unverified and cannot log in until verified', async () => {
      const user = await registerWithPassword();
      expect(user.isEmailVerified()).toBe(false);
      expect(user.canLoginWithPassword()).toBe(false);
    });

    it('can log in once the email is verified', async () => {
      const user = await registerWithPassword();
      user.verifyEmailNow();
      expect(user.canLoginWithPassword()).toBe(true);
    });

    it('raises UserRegisteredWithPassword', async () => {
      const user = await registerWithPassword();
      const events = user.pullDomainEvents();
      expect(events.map((e) => e.eventName)).toContain('identity.user_registered_with_password');
    });
  });

  describe('verifyPassword', () => {
    it('matches the correct plaintext and rejects the wrong one', async () => {
      const user = await registerWithPassword();
      expect(await user.verifyPassword('correct-horse-battery')).toBe(true);
      expect(await user.verifyPassword('wrong-password')).toBe(false);
    });

    it('is always false for a Google-only account', () => {
      const user = User.registerFromGoogle({
        googleId: 'google-1',
        email: email(),
        name: 'Buyer',
        avatarUrl: null,
      });
      return expect(user.verifyPassword('anything')).resolves.toBe(false);
    });
  });

  describe('account linking (.docs/07-auth.md §1b)', () => {
    it('links a Google account to a password-only user', async () => {
      const user = await registerWithPassword();
      const result = user.linkGoogleAccount('google-1');
      expect(result.isOk()).toBe(true);
      expect(user.googleId).toBe('google-1');
    });

    it('refuses to link a second Google account', async () => {
      const user = await registerWithPassword();
      user.linkGoogleAccount('google-1');
      const result = user.linkGoogleAccount('google-2');
      expect(result.isErr()).toBe(true);
      expect(user.googleId).toBe('google-1');
    });

    it('refuses to unlink Google when no password is set (retain-one-method invariant)', () => {
      const user = User.registerFromGoogle({
        googleId: 'google-1',
        email: email(),
        name: 'Buyer',
        avatarUrl: null,
      });
      const result = user.unlinkGoogleAccount();
      expect(result.isErr()).toBe(true);
      expect(user.googleId).toBe('google-1');
    });

    it('allows unlinking Google once a password is set', async () => {
      const user = User.registerFromGoogle({
        googleId: 'google-1',
        email: email(),
        name: 'Buyer',
        avatarUrl: null,
      });
      const passwordHash = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();
      user.setPasswordHash(passwordHash);

      const result = user.unlinkGoogleAccount();
      expect(result.isOk()).toBe(true);
      expect(user.googleId).toBeNull();
    });

    it('refuses to unlink when nothing is linked', async () => {
      const user = await registerWithPassword();
      const result = user.unlinkGoogleAccount();
      expect(result.isErr()).toBe(true);
    });

    it('setPasswordHash raises PasswordSet the first time and PasswordChanged thereafter', async () => {
      const user = User.registerFromGoogle({
        googleId: 'google-1',
        email: email(),
        name: 'Buyer',
        avatarUrl: null,
      });
      user.pullDomainEvents();

      const first = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();
      user.setPasswordHash(first);
      expect(user.pullDomainEvents().map((e) => e.eventName)).toEqual(['identity.password_set']);

      const second = (await PasswordHash.fromPlainText('another-horse-battery')).unwrap();
      user.setPasswordHash(second);
      expect(user.pullDomainEvents().map((e) => e.eventName)).toEqual([
        'identity.password_changed',
      ]);
    });
  });

  describe('completeProfile', () => {
    it('updates name and phone and raises UserProfileCompleted', async () => {
      const user = await registerWithPassword();
      user.pullDomainEvents();

      user.completeProfile({ name: 'New Name', phone: '+6281234567890' });

      expect(user.name).toBe('New Name');
      expect(user.phone).toBe('+6281234567890');
      expect(user.pullDomainEvents().map((e) => e.eventName)).toEqual([
        'identity.user_profile_completed',
      ]);
    });
  });
});
