import { TokenRotationService } from './token-rotation.service';
import { RefreshToken } from '../entities/refresh-token.entity';

const issueToken = (overrides: Partial<Parameters<typeof RefreshToken.issue>[0]> = {}) =>
  RefreshToken.issue({
    userId: 'user-1',
    tokenHash: 'old-hash',
    familyId: 'family-1',
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  });

describe('TokenRotationService', () => {
  const service = new TokenRotationService();

  it('rotates an active token: revokes the old one and issues a new one in the same family', () => {
    const presented = issueToken();

    const result = service.rotate({ presented, newTokenHash: 'new-hash', ttlMs: 60_000 });

    expect(result.isOk()).toBe(true);
    const outcome = result.unwrap();
    expect(outcome.kind).toBe('rotated');
    if (outcome.kind !== 'rotated') throw new Error('expected rotated outcome');

    expect(outcome.revoked.isRevoked()).toBe(true);
    expect(outcome.revoked.replacedById).toBe(outcome.issued.id);
    expect(outcome.issued.familyId).toBe(presented.familyId);
    expect(outcome.issued.tokenHash).toBe('new-hash');
  });

  it('rejects an expired token without rotating', () => {
    const presented = issueToken({ expiresAt: new Date(Date.now() - 1000) });

    const result = service.rotate({ presented, newTokenHash: 'new-hash', ttlMs: 60_000 });

    expect(result.isErr()).toBe(true);
    expect(presented.isRevoked()).toBe(false);
  });

  it('detects reuse when an already-revoked token is presented again', () => {
    const presented = issueToken();
    presented.revoke();

    const result = service.rotate({ presented, newTokenHash: 'new-hash', ttlMs: 60_000 });

    expect(result.isOk()).toBe(true);
    const outcome = result.unwrap();
    expect(outcome.kind).toBe('reuse_detected');
    if (outcome.kind !== 'reuse_detected') throw new Error('expected reuse_detected outcome');
    expect(outcome.familyId).toBe(presented.familyId);
    expect(outcome.userId).toBe(presented.userId);
  });
});
