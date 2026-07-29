import { useAuthTokenStore } from './token-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

let inFlightRefresh: Promise<string | null> | null = null;

const performRefresh = async (): Promise<string | null> => {
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    useAuthTokenStore.getState().setAccessToken(null);
    return null;
  }

  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('data' in payload) ||
    typeof payload.data !== 'object' ||
    payload.data === null ||
    !('accessToken' in payload.data) ||
    typeof payload.data.accessToken !== 'string'
  ) {
    useAuthTokenStore.getState().setAccessToken(null);
    return null;
  }

  const { accessToken } = payload.data;
  useAuthTokenStore.getState().setAccessToken(accessToken);
  return accessToken;
};

/**
 * Single-flight: concurrent callers await the same in-progress refresh
 * instead of each triggering their own /auth/refresh call.
 */
export const refreshAccessToken = (): Promise<string | null> => {
  if (!inFlightRefresh) {
    inFlightRefresh = performRefresh().finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
};
