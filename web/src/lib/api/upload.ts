import { useAuthTokenStore } from '../auth/token-store';
import { refreshAccessToken } from '../auth/refresh';
import { ApiError, type ProblemDetail } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const isProblemDetail = (value: unknown): value is ProblemDetail =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'detail' in value &&
  'title' in value;

const isEnvelope = (value: unknown): value is { data: unknown } =>
  typeof value === 'object' && value !== null && 'data' in value;

const parseResponseText = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const performUpload = <T>(
  path: string,
  file: File,
  accessToken: string | null,
  onProgress?: (percent: number) => void,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}${path}`);
    xhr.withCredentials = true;
    if (accessToken) {
      xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    }

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      const payload = parseResponseText(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!isEnvelope(payload)) {
          reject(new Error('Unexpected response shape'));
          return;
        }
        resolve(payload.data as T);
        return;
      }
      const problem: ProblemDetail = isProblemDetail(payload)
        ? payload
        : {
            type: 'unknown',
            title: 'Upload failed',
            status: xhr.status,
            detail: 'Terjadi kesalahan, coba lagi.',
          };
      reject(new ApiError(problem));
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload'));
    };

    const formData = new FormData();
    formData.append('file', file);
    xhr.send(formData);
  });

export const uploadFile = async <T>(
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<T> => {
  const accessToken = useAuthTokenStore.getState().accessToken;
  try {
    return await performUpload<T>(path, file, accessToken, onProgress);
  } catch (error) {
    if (error instanceof ApiError && error.problem.status === 401) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        return performUpload<T>(path, file, newToken, onProgress);
      }
    }
    throw error;
  }
};
