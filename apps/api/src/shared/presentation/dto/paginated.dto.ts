export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export class Paginated<T> {
  private constructor(
    readonly items: T[],
    readonly meta: PaginationMeta,
  ) {}

  static of<T>(items: T[], params: { page: number; limit: number; total: number }): Paginated<T> {
    return new Paginated(items, {
      page: params.page,
      limit: params.limit,
      total: params.total,
      hasMore: params.page * params.limit < params.total,
    });
  }
}
