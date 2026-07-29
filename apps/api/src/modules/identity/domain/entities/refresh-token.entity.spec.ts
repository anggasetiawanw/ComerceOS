import { RefreshToken } from './refresh-token.entity';

const issueToken = (overrides: Partial<Parameters<typeof RefreshToken.issue>[0]> = {}) =>
  RefreshToken.issue({
    userId: 'user-1',
    tokenHash: 'hash-1',
    familyId: 'family-1',
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  });

describe('RefreshToken', () => {
  it('is active when neither revoked nor expired', () => {
    const token = issueToken();
    expect(token.isActive()).toBe(true);
    expect(token.isRevoked()).toBe(false);
    expect(token.isExpired()).toBe(false);
  });

  it('is expired once past its expiry date', () => {
    const token = issueToken({ expiresAt: new Date(Date.now() - 1000) });
    expect(token.isExpired()).toBe(true);
    expect(token.isActive()).toBe(false);
  });

  it('revoke() marks it revoked and records the replacement', () => {
    const token = issueToken();
    token.revoke('successor-id');
    expect(token.isRevoked()).toBe(true);
    expect(token.isActive()).toBe(false);
    expect(token.replacedById).toBe('successor-id');
    expect(token.revokedAt).not.toBeNull();
  });

  it('revoke() without a successor still marks it revoked', () => {
    const token = issueToken();
    token.revoke();
    expect(token.isRevoked()).toBe(true);
    expect(token.replacedById).toBeNull();
  });
});
