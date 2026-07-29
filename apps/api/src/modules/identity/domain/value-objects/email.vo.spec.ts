import { Email } from './email.vo';

describe('Email', () => {
  it('accepts a well-formed address', () => {
    const result = Email.create('Seller@Example.com');
    expect(result.isOk()).toBe(true);
  });

  it('normalizes case and whitespace', () => {
    const email = Email.create('  Seller@Example.com  ').unwrap();
    expect(email.value).toBe('seller@example.com');
  });

  it('rejects a malformed address', () => {
    expect(Email.create('not-an-email').isErr()).toBe(true);
    expect(Email.create('missing-domain@').isErr()).toBe(true);
    expect(Email.create('@missing-local.com').isErr()).toBe(true);
  });

  it('compares by normalized value', () => {
    const a = Email.create('a@example.com').unwrap();
    const b = Email.create('A@Example.com').unwrap();
    expect(a.equals(b)).toBe(true);
  });
});
