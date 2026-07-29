import { Inject, Injectable } from '@nestjs/common';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { User } from '../../domain/entities/user.aggregate';
import { UserRepository, USER_REPOSITORY } from '../../domain/repositories/user.repository';

@Injectable()
export class UserProfileService {
  constructor(@Inject(USER_REPOSITORY) private readonly users: UserRepository) {}

  async getCurrentUser(userId: UniqueId): Promise<User | null> {
    return this.users.findById(userId);
  }

  async updateProfile(
    userId: UniqueId,
    params: { name?: string; phone?: string },
  ): Promise<User | null> {
    const user = await this.users.findById(userId);
    if (!user) return null;
    user.completeProfile(params);
    await this.users.save(user);
    return user;
  }
}
