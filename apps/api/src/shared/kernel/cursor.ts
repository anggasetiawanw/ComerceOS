import { Result } from './result';
import { InvalidCursorError } from '../domain-errors/cursor.errors';

// A cursor is opaque to the client (.docs/05-api-roadmap.md §17) and carries
// a generic (sortKey, id) pair rather than a hardcoded (created_at, id) —
// the buyers list sorts by total_spent/total_orders/last_purchase_at, and a
// cursor hardcoded to created_at would silently break under any of those.
// id is always the tiebreaker, which is what makes ties in the sort key
// paginate correctly.
export interface CursorPosition {
  k: string;
  i: string;
}

export const encodeCursor = (position: CursorPosition): string =>
  Buffer.from(JSON.stringify(position), 'utf8').toString('base64url');

export const decodeCursor = (cursor: string): Result<CursorPosition, InvalidCursorError> => {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      typeof (decoded as Record<string, unknown>).k !== 'string' ||
      typeof (decoded as Record<string, unknown>).i !== 'string'
    ) {
      return Result.err(new InvalidCursorError());
    }
    const { k, i } = decoded as CursorPosition;
    return Result.ok({ k, i });
  } catch {
    return Result.err(new InvalidCursorError());
  }
};
