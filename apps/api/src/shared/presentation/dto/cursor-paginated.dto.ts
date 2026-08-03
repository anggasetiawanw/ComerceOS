export interface CursorMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export class CursorPaginated<T> {
  private constructor(
    readonly items: T[],
    readonly meta: CursorMeta,
  ) {}

  static of<T>(items: T[], meta: CursorMeta): CursorPaginated<T> {
    return new CursorPaginated(items, meta);
  }
}
