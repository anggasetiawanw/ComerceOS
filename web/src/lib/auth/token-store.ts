import { create } from 'zustand';

interface AuthTokenState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

export const useAuthTokenStore = create<AuthTokenState>((set) => ({
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
}));
