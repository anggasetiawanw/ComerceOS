import { VerificationToken } from './verification-token.entity';

describe('VerificationToken', () => {
  it('is valid immediately after issuance', () => {
    const token = VerificationToken.issue({
      userId: 'user-1',
      tokenHash: 'hash-1',
      purpose: 'email_verification',
      ttlMs: 60_000,
    });
    expect(token.isValid()).toBe(true);
    expect(token.isUsed()).toBe(false);
    expect(token.isExpired()).toBe(false);
  });

  it('expires after its ttl', () => {
    const token = VerificationToken.issue({
      userId: 'user-1',
      tokenHash: 'hash-1',
      purpose: 'password_reset',
      ttlMs: -1,
    });
    expect(token.isExpired()).toBe(true);
    expect(token.isValid()).toBe(false);
  });

  it('markUsed() makes it invalid even before expiry', () => {
    const token = VerificationToken.issue({
      userId: 'user-1',
      tokenHash: 'hash-1',
      purpose: 'email_verification',
      ttlMs: 60_000,
    });
    token.markUsed();
    expect(token.isUsed()).toBe(true);
    expect(token.isValid()).toBe(false);
  });
});
