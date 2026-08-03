import { useAuthTokenStore } from '../auth/token-store';
import { refreshAccessToken } from '../auth/refresh';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  constructor(readonly problem: ProblemDetail) {
    super(problem.detail);
  }
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Attach the bearer token and retry once through single-flight refresh on 401. Default true. */
  auth?: boolean;
  headers?: Record<string, string>;
}

const isProblemDetail = (value: unknown): value is ProblemDetail =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'detail' in value &&
  'title' in value;

const isEnvelope = (value: unknown): value is { data: unknown; meta?: PaginationMeta } =>
  typeof value === 'object' && value !== null && 'data' in value;

const doFetchEnvelope = async <T>(
  path: string,
  options: RequestOptions,
  accessToken: string | null,
  isRetry = false,
): Promise<{ data: T; meta?: PaginationMeta }> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...options.headers };
  if (options.auth !== false && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && options.auth !== false && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return doFetchEnvelope<T>(path, options, newToken, true);
    }
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
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

  return { data: payload.data as T, meta: payload.meta };
};

const doFetch = async <T>(path: string, options: RequestOptions, accessToken: string | null): Promise<T> => {
  const envelope = await doFetchEnvelope<T>(path, options, accessToken);
  return envelope.data;
};

type Options = Omit<RequestOptions, 'method' | 'body'>;

export const apiClient = {
  get: <T>(path: string, options: Options = {}) =>
    doFetch<T>(path, { ...options, method: 'GET' }, useAuthTokenStore.getState().accessToken),
  getPaginated: async <T>(path: string, options: Options = {}): Promise<PaginatedResult<T>> => {
    const envelope = await doFetchEnvelope<T[]>(
      path,
      { ...options, method: 'GET' },
      useAuthTokenStore.getState().accessToken,
    );
    return { items: envelope.data, meta: envelope.meta ?? { page: 1, limit: envelope.data.length, total: envelope.data.length, hasMore: false } };
  },
  post: <T>(path: string, body?: unknown, options: Options = {}) =>
    doFetch<T>(
      path,
      { ...options, method: 'POST', body },
      useAuthTokenStore.getState().accessToken,
    ),
  patch: <T>(path: string, body?: unknown, options: Options = {}) =>
    doFetch<T>(
      path,
      { ...options, method: 'PATCH', body },
      useAuthTokenStore.getState().accessToken,
    ),
  put: <T>(path: string, body?: unknown, options: Options = {}) =>
    doFetch<T>(path, { ...options, method: 'PUT', body }, useAuthTokenStore.getState().accessToken),
  delete: <T>(path: string, options: Options = {}) =>
    doFetch<T>(path, { ...options, method: 'DELETE' }, useAuthTokenStore.getState().accessToken),
};
