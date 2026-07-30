const KEY_PREFIX = 'nagihin';

export const buildCacheKey = (namespace: string, version: string, ...parts: string[]): string =>
  [KEY_PREFIX, namespace, version, ...parts].join(':');
