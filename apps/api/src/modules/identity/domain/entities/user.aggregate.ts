import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Email } from '../value-objects/email.vo';
import { PasswordHash } from '../value-objects/password-hash.vo';
import { UserRole } from '../value-objects/user-role.vo';
import { AccountLinkingViolationError } from '../errors/identity.errors';
import { UserRegisteredEvent } from '../events/user-registered.event';
import { UserRegisteredWithPasswordEvent } from '../events/user-registered-with-password.event';
import { UserProfileCompletedEvent } from '../events/user-profile-completed.event';
import { EmailVerifiedEvent } from '../events/email-verified.event';
import { GoogleAccountLinkedEvent } from '../events/google-account-linked.event';
import { PasswordSetEvent } from '../events/password-set.event';
import { PasswordChangedEvent } from '../events/password-changed.event';

export interface UserProps {
  googleId: string | null;
  email: Email;
  passwordHash: PasswordHash | null;
  emailVerifiedAt: Date | null;
  name: string;
  avatarUrl: string | null;
  phone: string | null;
  role: UserRole;
  createdAt: Date;
}

export class User extends AggregateRoot<UserProps> {
  private constructor(props: UserProps, id?: UniqueId) {
    super(props, id);
  }

  static registerFromGoogle(params: {
    googleId: string;
    email: Email;
    name: string;
    avatarUrl: string | null;
  }): User {
    const user = new User({
      googleId: params.googleId,
      email: params.email,
      passwordHash: null,
      emailVerifiedAt: new Date(),
      name: params.name,
      avatarUrl: params.avatarUrl,
      phone: null,
      role: UserRole.buyer(),
      createdAt: new Date(),
    });
    user.addDomainEvent(new UserRegisteredEvent(user.id, user.email.value));
    return user;
  }

  static registerWithPassword(params: {
    email: Email;
    passwordHash: PasswordHash;
    name: string;
  }): User {
    const user = new User({
      googleId: null,
      email: params.email,
      passwordHash: params.passwordHash,
      emailVerifiedAt: null,
      name: params.name,
      avatarUrl: null,
      phone: null,
      role: UserRole.buyer(),
      createdAt: new Date(),
    });
    user.addDomainEvent(new UserRegisteredWithPasswordEvent(user.id, user.email.value));
    return user;
  }

  // Sprint 9 — Path B. A manual order needs a buyer_id, but the buyer
  // typically has never registered. No googleId, no passwordHash, email
  // unverified — this account is claimed later via /lupa-password, the
  // only login path a passwordless user has (.docs/12-roadmap-sprints.md
  // Sprint 9). Deliberately does not emit UserRegisteredEvent/
  // UserRegisteredWithPasswordEvent — this isn't a self-service
  // registration and nothing downstream should treat it as one.
  static registerAsGuestBuyer(params: { email: Email; name: string; phone: string | null }): User {
    return new User({
      googleId: null,
      email: params.email,
      passwordHash: null,
      emailVerifiedAt: null,
      name: params.name,
      avatarUrl: null,
      phone: params.phone,
      role: UserRole.buyer(),
      createdAt: new Date(),
    });
  }

  static reconstitute(props: UserProps, id: UniqueId): User {
    return new User(props, id);
  }

  get googleId(): string | null {
    return this.props.googleId;
  }

  get email(): Email {
    return this.props.email;
  }

  get passwordHash(): PasswordHash | null {
    return this.props.passwordHash;
  }

  get emailVerifiedAt(): Date | null {
    return this.props.emailVerifiedAt;
  }

  get name(): string {
    return this.props.name;
  }

  get avatarUrl(): string | null {
    return this.props.avatarUrl;
  }

  get phone(): string | null {
    return this.props.phone;
  }

  get role(): UserRole {
    return this.props.role;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  isEmailVerified(): boolean {
    return this.props.emailVerifiedAt !== null;
  }

  canLoginWithPassword(): boolean {
    return this.props.passwordHash !== null && this.isEmailVerified();
  }

  verifyPassword(plain: string): Promise<boolean> {
    if (!this.props.passwordHash) {
      return Promise.resolve(false);
    }
    return this.props.passwordHash.verify(plain);
  }

  verifyEmailNow(): void {
    if (this.isEmailVerified()) return;
    this.props.emailVerifiedAt = new Date();
    this.addDomainEvent(new EmailVerifiedEvent(this.id));
  }

  completeProfile(params: { name?: string; phone?: string }): void {
    if (params.name) this.props.name = params.name;
    if (params.phone) this.props.phone = params.phone;
    this.addDomainEvent(new UserProfileCompletedEvent(this.id));
  }

  linkGoogleAccount(googleId: string): Result<void, AccountLinkingViolationError> {
    if (this.props.googleId) {
      return Result.err(new AccountLinkingViolationError('Google account is already linked'));
    }
    this.props.googleId = googleId;
    this.addDomainEvent(new GoogleAccountLinkedEvent(this.id));
    return Result.ok(undefined);
  }

  unlinkGoogleAccount(): Result<void, AccountLinkingViolationError> {
    if (!this.props.googleId) {
      return Result.err(new AccountLinkingViolationError('No Google account is linked'));
    }
    if (!this.props.passwordHash) {
      return Result.err(
        new AccountLinkingViolationError('Cannot unlink Google without a password set first'),
      );
    }
    this.props.googleId = null;
    return Result.ok(undefined);
  }

  setPasswordHash(passwordHash: PasswordHash): Result<void, AccountLinkingViolationError> {
    const isFirstPassword = this.props.passwordHash === null;
    this.props.passwordHash = passwordHash;
    this.addDomainEvent(
      isFirstPassword ? new PasswordSetEvent(this.id) : new PasswordChangedEvent(this.id),
    );
    return Result.ok(undefined);
  }
}
