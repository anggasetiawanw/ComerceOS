import { User } from '../../../domain/entities/user.aggregate';

export interface UserStoreSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  plan: string;
}

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  avatarUrl!: string | null;
  phone!: string | null;
  role!: string;
  emailVerified!: boolean;
  googleLinked!: boolean;
  hasPassword!: boolean;
  createdAt!: Date;
  store!: UserStoreSummary | null;

  static fromDomain(user: User, store: UserStoreSummary | null = null): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email.value;
    dto.name = user.name;
    dto.avatarUrl = user.avatarUrl;
    dto.phone = user.phone;
    dto.role = user.role.value;
    dto.emailVerified = user.isEmailVerified();
    dto.googleLinked = user.googleId !== null;
    dto.hasPassword = user.passwordHash !== null;
    dto.createdAt = user.createdAt;
    dto.store = store;
    return dto;
  }
}
