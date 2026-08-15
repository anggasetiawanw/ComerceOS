import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { ImageFileValidator } from '../../../../shared/presentation/pipes/image-file.validator';
import { StoreService } from '../../application/services/store.service';
import { StoreUploadService } from '../../application/services/store-upload.service';
import { StoreOwnerGuard } from '../guards/store-owner.guard';
import { CreateStoreDto } from '../dto/requests/create-store.dto';
import { UpdateStoreDto } from '../dto/requests/update-store.dto';
import { ChangeUsernameDto } from '../dto/requests/change-username.dto';
import { UsernameAvailableQueryDto } from '../dto/requests/username-available.query.dto';
import { StoreResponseDto } from '../dto/responses/store-response.dto';
import { UsernameAvailabilityResponseDto } from '../dto/responses/username-availability-response.dto';

const USERNAME_AVAILABILITY_THROTTLE = { default: { limit: 30, ttl: 60_000 } };
const USERNAME_CHANGE_THROTTLE = { default: { limit: 3, ttl: 24 * 60 * 60 * 1000 } };
const AVATAR_MAX_BYTES = 2_097_152;
const BANNER_MAX_BYTES = 5_242_880;

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(
    private readonly stores: StoreService,
    private readonly uploads: StoreUploadService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createStore(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateStoreDto,
  ): Promise<StoreResponseDto> {
    const result = await this.stores.createStore({
      ownerId: user.id,
      username: dto.username,
      displayName: dto.displayName,
    });
    return StoreResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Get('me')
  async getMyStore(@CurrentUser() user: CurrentUserPayload): Promise<StoreResponseDto | null> {
    const store = await this.stores.getMyStore(user.id);
    return store ? StoreResponseDto.fromDomain(store) : null;
  }

  @Get('username-available')
  @Throttle(USERNAME_AVAILABILITY_THROTTLE)
  async checkUsernameAvailability(
    @Query() query: UsernameAvailableQueryDto,
  ): Promise<UsernameAvailabilityResponseDto> {
    const result = await this.stores.checkUsernameAvailability(query.username);
    return UsernameAvailabilityResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Patch('me')
  @UseGuards(StoreOwnerGuard)
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateStoreDto,
  ): Promise<StoreResponseDto> {
    const result = await this.stores.updateProfile(user.id, {
      displayName: dto.displayName,
      bio: dto.bio,
      whatsappNumber: dto.whatsappNumber,
    });
    return StoreResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Patch('me/username')
  @UseGuards(StoreOwnerGuard)
  @Throttle(USERNAME_CHANGE_THROTTLE)
  async changeUsername(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangeUsernameDto,
  ): Promise<StoreResponseDto> {
    const result = await this.stores.changeUsername(user.id, dto.username);
    return StoreResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Post('me/avatar')
  @UseGuards(StoreOwnerGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: AVATAR_MAX_BYTES }), new ImageFileValidator()],
      }),
    )
    file: Express.Multer.File,
  ): Promise<StoreResponseDto> {
    const result = await this.uploads.uploadAvatar(user.id, { buffer: file.buffer, mimetype: file.mimetype });
    return StoreResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Post('me/banner')
  @UseGuards(StoreOwnerGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: BANNER_MAX_BYTES }), new ImageFileValidator()],
      }),
    )
    file: Express.Multer.File,
  ): Promise<StoreResponseDto> {
    const result = await this.uploads.uploadBanner(user.id, { buffer: file.buffer, mimetype: file.mimetype });
    return StoreResponseDto.fromDomain(unwrapOrThrow(result));
  }
}
