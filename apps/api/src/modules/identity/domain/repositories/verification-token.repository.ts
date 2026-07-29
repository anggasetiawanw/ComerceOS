import {
  VerificationToken,
  VerificationTokenPurpose,
} from '../entities/verification-token.entity';
import { UniqueId } from '../../../../shared/kernel/uuid';

export const VERIFICATION_TOKEN_REPOSITORY = Symbol('VERIFICATION_TOKEN_REPOSITORY');

export interface VerificationTokenRepository {
  findByHash(tokenHash: string): Promise<VerificationToken | null>;
  save(token: VerificationToken): Promise<void>;
  invalidateOutstanding(userId: UniqueId, purpose: VerificationTokenPurpose): Promise<void>;
}
