import { v7 as uuidv7 } from 'uuid';

export type UniqueId = string;

export const generateId = (): UniqueId => uuidv7();
