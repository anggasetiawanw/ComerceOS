import { apiClient } from '@/lib/api/client';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  googleLinked: boolean;
  hasPassword: boolean;
  createdAt: string;
}

export interface AuthTokensResponse {
  accessToken: string;
  user: UserResponse;
}

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    apiClient.post<UserResponse>('/auth/register', input, { auth: false }),
  login: (input: { email: string; password: string }) =>
    apiClient.post<AuthTokensResponse>('/auth/login', input, { auth: false }),
  verifyEmail: (token: string) =>
    apiClient.post<{ verified: true }>('/auth/verify-email', { token }, { auth: false }),
  forgotPassword: (input: { email: string }) =>
    apiClient.post<{ sent: true }>('/auth/forgot-password', input, { auth: false }),
  resetPassword: (input: { token: string; password: string }) =>
    apiClient.post<{ reset: true }>('/auth/reset-password', input, { auth: false }),
  me: () => apiClient.get<UserResponse>('/users/me'),
  logout: () => apiClient.post<{ loggedOut: true }>('/auth/logout'),
};
