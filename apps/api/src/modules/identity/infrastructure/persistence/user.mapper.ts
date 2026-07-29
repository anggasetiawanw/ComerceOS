import { User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/user.aggregate';
import { Email } from '../../domain/value-objects/email.vo';
import { PasswordHash } from '../../domain/value-objects/password-hash.vo';
import { UserRole } from '../../domain/value-objects/user-role.vo';

export class UserMapper {
  static toDomain(row: PrismaUser): User {
    const emailResult = Email.create(row.email);
    if (emailResult.isErr()) {
      throw new Error(`Corrupt user row: invalid email "${row.email}"`);
    }
    const roleResult = UserRole.create(row.role);
    if (roleResult.isErr()) {
      throw new Error(`Corrupt user row: invalid role "${row.role}"`);
    }

    return User.reconstitute(
      {
        googleId: row.googleId,
        email: emailResult.unwrap(),
        passwordHash: row.passwordHash ? PasswordHash.fromHash(row.passwordHash) : null,
        emailVerifiedAt: row.emailVerifiedAt,
        name: row.name,
        avatarUrl: row.avatarUrl,
        phone: row.phone,
        role: roleResult.unwrap(),
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistence(user: User): PrismaUser {
    return {
      id: user.id,
      googleId: user.googleId,
      email: user.email.value,
      passwordHash: user.passwordHash?.hash ?? null,
      emailVerifiedAt: user.emailVerifiedAt,
      name: user.name,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      role: user.role.value,
      createdAt: user.createdAt,
    };
  }
}
