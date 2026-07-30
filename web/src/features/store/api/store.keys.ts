export const storeKeys = {
  all: ['store'] as const,
  me: () => [...storeKeys.all, 'me'] as const,
  settings: () => [...storeKeys.all, 'settings'] as const,
  socialLinks: () => [...storeKeys.all, 'social-links'] as const,
  usernameAvailability: (username: string) => [...storeKeys.all, 'username', username] as const,
};
