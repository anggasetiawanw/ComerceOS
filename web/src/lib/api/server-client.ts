import type { ZodType } from 'zod';
import { ApiError, type ProblemDetail } from './client';

const API_BASE_URL =
  process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const isProblemDetail = (value: unknown): value is ProblemDetail =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'detail' in value &&
  'title' in value;

const isEnvelope = (value: unknown): value is { data: unknown } =>
  typeof value === 'object' && value !== null && 'data' in value;

export class NotFoundError extends Error {}

interface ServerFetchOptions {
  revalidate?: number;
  tags?: string[];
}

export const serverFetch = async <T>(
  path: string,
  schema: ZodType<T>,
  options: ServerFetchOptions = {},
): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: options.revalidate, tags: options.tags },
  });

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 404) {
      throw new NotFoundError(`Not found: ${path}`);
    }
    const problem: ProblemDetail = isProblemDetail(payload)
      ? payload
      : {
          type: 'unknown',
          title: 'Request failed',
          status: response.status,
          detail: 'Terjadi kesalahan, coba lagi.',
        };
    throw new ApiError(problem);
  }

  if (!isEnvelope(payload)) {
    throw new Error('Unexpected response shape');
  }

  const result = schema.safeParse(payload.data);
  if (!result.success) {
    throw new Error(`Response failed schema validation for ${path}: ${result.error.message}`);
  }

  return result.data satisfies T;
};
