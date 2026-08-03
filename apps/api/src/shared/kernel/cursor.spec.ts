import { decodeCursor, encodeCursor } from './cursor';
import { InvalidCursorError } from '../domain-errors/cursor.errors';

describe('cursor', () => {
  it('round-trips a position through encode/decode', () => {
    const position = { k: '150000', i: 'abc-123' };
    const decoded = decodeCursor(encodeCursor(position));
    expect(decoded.isOk()).toBe(true);
    expect(decoded.unwrap()).toEqual(position);
  });

  it('rejects a tampered cursor', () => {
    const decoded = decodeCursor('not-valid-base64url-json');
    expect(decoded.isErr()).toBe(true);
    expect(decoded.unwrapErr()).toBeInstanceOf(InvalidCursorError);
  });

  it('rejects a cursor decoding to the wrong shape', () => {
    const malformed = Buffer.from(JSON.stringify({ foo: 'bar' }), 'utf8').toString('base64url');
    const decoded = decodeCursor(malformed);
    expect(decoded.isErr()).toBe(true);
  });
});
