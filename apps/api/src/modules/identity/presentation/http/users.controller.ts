import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { StoreService } from '../../../store/application/services/store.service';
import { UserProfileService } from '../../application/services/user-profile.service';
import { UpdateProfileDto } from '../dto/requests/update-profile.dto';
import { UserResponseDto, UserStoreSummary } from '../dto/responses/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly userProfile: UserProfileService,
    private readonly stores: StoreService,
  ) {}

  @Get('me')
  async getCurrentUser(@CurrentUser() currentUser: CurrentUserPayload): Promise<UserResponseDto> {
    const user = await this.userProfile.getCurrentUser(currentUser.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return UserResponseDto.fromDomain(user, await this.storeSummary(currentUser.id));
  }

  @Patch('me')
  async updateCurrentUser(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userProfile.updateProfile(currentUser.id, dto);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return UserResponseDto.fromDomain(user, await this.storeSummary(currentUser.id));
  }

  private async storeSummary(ownerId: string): Promise<UserStoreSummary | null> {
    const store = await this.stores.getMyStore(ownerId);
    if (!store) return null;
    return {
      id: store.id,
      username: store.username.value,
      displayName: store.profile.displayName,
      avatarUrl: store.profile.avatarUrl,
      plan: store.plan.value,
    };
  }
}
