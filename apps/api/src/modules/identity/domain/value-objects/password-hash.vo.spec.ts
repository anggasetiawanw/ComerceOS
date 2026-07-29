import { PasswordHash } from './password-hash.vo';

describe('PasswordHash', () => {
  it('rejects a password shorter than 8 characters', async () => {
    const result = await PasswordHash.fromPlainText('short');
    expect(result.isErr()).toBe(true);
  });

  it('hashes a valid password with Argon2id', async () => {
    const result = await PasswordHash.fromPlainText('correct-horse-battery');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().hash).toMatch(/^\$argon2id\$/);
  });

  it('verifies the correct plaintext and rejects the wrong one', async () => {
    const passwordHash = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();
    expect(await passwordHash.verify('correct-horse-battery')).toBe(true);
    expect(await passwordHash.verify('wrong-password')).toBe(false);
  });

  it('reconstructs from an existing hash without re-hashing', async () => {
    const original = (await PasswordHash.fromPlainText('correct-horse-battery')).unwrap();
    const reconstructed = PasswordHash.fromHash(original.hash);
    expect(reconstructed.hash).toBe(original.hash);
    expect(await reconstructed.verify('correct-horse-battery')).toBe(true);
  });
});
