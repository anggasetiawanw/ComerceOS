import { Username } from './username.vo';

describe('Username', () => {
  it('rejects a username shorter than 3 characters', () => {
    const result = Username.create('ab');
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().reason).toBe('format');
  });

  it('accepts a username at exactly 3 characters', () => {
    const result = Username.create('abc');
    expect(result.isOk()).toBe(true);
  });

  it('accepts a username at exactly 30 characters', () => {
    const value = 'a'.repeat(30);
    const result = Username.create(value);
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toHaveLength(30);
  });

  it('rejects a username longer than 30 characters', () => {
    const result = Username.create('a'.repeat(31));
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().reason).toBe('format');
  });

  it('rejects spaces', () => {
    const result = Username.create('toko saya');
    expect(result.isErr()).toBe(true);
  });

  it('rejects a hyphen', () => {
    const result = Username.create('toko-saya');
    expect(result.isErr()).toBe(true);
  });

  it('normalizes uppercase input instead of rejecting it', () => {
    const result = Username.create('TokoSaya');
    expect(result.isOk()).toBe(true);
    expect(result.unwrap().value).toBe('tokosaya');
  });

  it('rejects a leading dot', () => {
    const result = Username.create('.tokosaya');
    expect(result.isErr()).toBe(true);
  });

  it('rejects a trailing underscore', () => {
    const result = Username.create('tokosaya_');
    expect(result.isErr()).toBe(true);
  });

  it('allows an internal double dot', () => {
    const result = Username.create('toko..saya');
    expect(result.isOk()).toBe(true);
  });

  it.each(['admin', 'dashboard', 'akun', 'masuk', 'nagihin'])(
    'rejects the reserved word "%s" with reason reserved',
    (word) => {
      const result = Username.create(word);
      expect(result.isErr()).toBe(true);
      expect(result.unwrapErr().reason).toBe('reserved');
    },
  );

  it('treats the reserved blocklist as case-insensitive', () => {
    const result = Username.create('ADMIN');
    expect(result.isErr()).toBe(true);
    expect(result.unwrapErr().reason).toBe('reserved');
  });

  it('exposes the normalized value via toString and toJSON', () => {
    const username = Username.create('TokoSaya').unwrap();
    expect(username.toString()).toBe('tokosaya');
    expect(username.toJSON()).toBe('tokosaya');
  });
});
