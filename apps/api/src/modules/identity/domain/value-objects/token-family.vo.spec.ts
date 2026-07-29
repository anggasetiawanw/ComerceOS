import { TokenFamily } from './token-family.vo';

describe('TokenFamily', () => {
  it('generates a fresh UUIDv7 id on create', () => {
    const family = TokenFamily.create();
    expect(family.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('two freshly created families are never equal', () => {
    expect(TokenFamily.create().equals(TokenFamily.create())).toBe(false);
  });

  it('reconstructs deterministically from an existing id', () => {
    const a = TokenFamily.fromId('fixed-id');
    const b = TokenFamily.fromId('fixed-id');
    expect(a.equals(b)).toBe(true);
  });
});
