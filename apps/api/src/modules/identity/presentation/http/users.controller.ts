import { Body, Controller, Get, NotFoundException, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { UserProfileService } from '../../application/services/user-profile.service';
import { UpdateProfileDto } from '../dto/requests/update-profile.dto';
import { UserResponseDto } from '../dto/responses/user-response.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly userProfile: UserProfileService) {}

  @Get('me')
  async getCurrentUser(@CurrentUser() currentUser: CurrentUserPayload): Promise<UserResponseDto> {
    const user = await this.userProfile.getCurrentUser(currentUser.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return UserResponseDto.fromDomain(user);
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
    return UserResponseDto.fromDomain(user);
  }
}
