import { AccountLinkingService } from './account-linking.service';
import { User } from '../entities/user.aggregate';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';

const email = () => Email.create('buyer@example.com').unwrap();

describe('AccountLinkingService', () => {
  const service = new AccountLinkingService();

  it('links Google to a password-only account', async () => {
    const passwordHash = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();
    const user = User.registerWithPassword({ email: email(), passwordHash, name: 'Buyer' });

    const result = service.linkGoogleAccount(user, 'google-1');

    expect(result.isOk()).toBe(true);
    expect(user.googleId).toBe('google-1');
  });

  it('sets a password on a Google-only account', async () => {
    const user = User.registerFromGoogle({
      googleId: 'google-1',
      email: email(),
      name: 'Buyer',
      avatarUrl: null,
    });
    const passwordHash = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();

    const result = service.setPassword(user, passwordHash);

    expect(result.isOk()).toBe(true);
    expect(user.passwordHash).not.toBeNull();
  });

  it('enforces the retain-one-method invariant on unlink', () => {
    const user = User.registerFromGoogle({
      googleId: 'google-1',
      email: email(),
      name: 'Buyer',
      avatarUrl: null,
    });

    const result = service.unlinkGoogleAccount(user);

    expect(result.isErr()).toBe(true);
    expect(user.googleId).toBe('google-1');
  });

  it('allows unlink once a password exists', async () => {
    const user = User.registerFromGoogle({
      googleId: 'google-1',
      email: email(),
      name: 'Buyer',
      avatarUrl: null,
    });
    const passwordHash = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();
    service.setPassword(user, passwordHash);

    const result = service.unlinkGoogleAccount(user);

    expect(result.isOk()).toBe(true);
    expect(user.googleId).toBeNull();
  });
});
