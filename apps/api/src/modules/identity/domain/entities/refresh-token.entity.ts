import { Entity } from '../../../../shared/kernel/entity.base';
import { UniqueId } from '../../../../shared/kernel/uuid';

export interface RefreshTokenProps {
  userId: UniqueId;
  tokenHash: string;
  familyId: UniqueId;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: UniqueId | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: Date;
}

export class RefreshToken extends Entity<RefreshTokenProps> {
  private constructor(props: RefreshTokenProps, id?: UniqueId) {
    super(props, id);
  }

  static issue(params: {
    userId: UniqueId;
    tokenHash: string;
    familyId: UniqueId;
    expiresAt: Date;
    userAgent?: string | null;
    ip?: string | null;
  }): RefreshToken {
    return new RefreshToken({
      userId: params.userId,
      tokenHash: params.tokenHash,
      familyId: params.familyId,
      expiresAt: params.expiresAt,
      revokedAt: null,
      replacedById: null,
      userAgent: params.userAgent ?? null,
      ip: params.ip ?? null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: RefreshTokenProps, id: UniqueId): RefreshToken {
    return new RefreshToken(props, id);
  }

  get userId(): UniqueId {
    return this.props.userId;
  }

  get tokenHash(): string {
    return this.props.tokenHash;
  }

  get familyId(): UniqueId {
    return this.props.familyId;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get replacedById(): UniqueId | null {
    return this.props.replacedById;
  }

  get userAgent(): string | null {
    return this.props.userAgent;
  }

  get ip(): string | null {
    return this.props.ip;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isExpired(now: Date = new Date()): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }

  isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  isActive(now: Date = new Date()): boolean {
    return !this.isRevoked() && !this.isExpired(now);
  }

  revoke(replacedById?: UniqueId): void {
    this.props.revokedAt = new Date();
    if (replacedById) {
      this.props.replacedById = replacedById;
    }
  }
}
