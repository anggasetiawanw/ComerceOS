import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export type VerificationTokenPurpose = 'email_verification' | 'password_reset';

export interface VerificationTokenProps {
  userId: UniqueId;
  tokenHash: string;
  purpose: VerificationTokenPurpose;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export class VerificationToken extends Entity<VerificationTokenProps> {
  private constructor(props: VerificationTokenProps, id?: UniqueId) {
    super(props, id);
  }

  static issue(params: {
    userId: UniqueId;
    tokenHash: string;
    purpose: VerificationTokenPurpose;
    ttlMs: number;
  }): VerificationToken {
    return new VerificationToken({
      userId: params.userId,
      tokenHash: params.tokenHash,
      purpose: params.purpose,
      expiresAt: new Date(Date.now() + params.ttlMs),
      usedAt: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: VerificationTokenProps, id: UniqueId): VerificationToken {
    return new VerificationToken(props, id);
  }

  get userId(): UniqueId {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get purpose(): VerificationTokenPurpose {
    return this.props.purpose;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get usedAt(): Date | null {
    return this.props.usedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  isUsed(): boolean {
    return this.props.usedAt !== null;
  }

  isValid(now: Date = new Date()): boolean {
    return !this.isUsed() && !this.isExpired(now);
  }

  markUsed(): void {
    this.props.usedAt = new Date();
  }
}
