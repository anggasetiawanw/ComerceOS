import { Request } from 'express';

export const getUserAgent = (req: Request): string | null => {
  const header = req.headers['user-agent'];
  return typeof header === 'string' ? header : null;
};

export const getClientIp = (req: Request): string | null => req.ip ?? null;
