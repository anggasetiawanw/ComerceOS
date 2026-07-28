import { Result } from './result';

describe('Result', () => {
  it('wraps a success value', () => {
    const result = Result.ok<number, string>(42);
    expect(result.isOk()).toBe(true);
    expect(result.isErr()).toBe(false);
    expect(result.unwrap()).toBe(42);
  });

  it('wraps a failure value', () => {
    const result = Result.err<number, string>('boom');
    expect(result.isErr()).toBe(true);
    expect(result.isOk()).toBe(false);
    expect(result.unwrapErr()).toBe('boom');
  });

  it('throws when unwrap() is called on an Err', () => {
    const result = Result.err<number, string>('boom');
    expect(() => result.unwrap()).toThrow();
  });

  it('throws when unwrapErr() is called on an Ok', () => {
    const result = Result.ok<number, string>(1);
    expect(() => result.unwrapErr()).toThrow();
  });

  it('maps an Ok value without touching an Err', () => {
    const ok = Result.ok<number, string>(2).map((n) => n * 2);
    expect(ok.unwrap()).toBe(4);

    const err = Result.err<number, string>('boom').map((n) => n * 2);
    expect(err.isErr()).toBe(true);
    expect(err.unwrapErr()).toBe('boom');
  });

  it('mapErr transforms an Err value without touching an Ok', () => {
    const err = Result.err<number, string>('boom').mapErr((e) => e.toUpperCase());
    expect(err.unwrapErr()).toBe('BOOM');

    const ok = Result.ok<number, string>(2).mapErr((e) => e.toUpperCase());
    expect(ok.unwrap()).toBe(2);
  });
});
