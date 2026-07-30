import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { unwrapOrThrow } from '../../../../shared/presentation/http/result.helper';
import { CurrentUser } from '../../../../shared/presentation/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../../../shared/security/current-user.interface';
import { SocialLinkService } from '../../application/services/social-link.service';
import { StoreOwnerGuard } from '../guards/store-owner.guard';
import { CreateSocialLinkDto } from '../dto/requests/create-social-link.dto';
import { UpdateSocialLinkDto } from '../dto/requests/update-social-link.dto';
import { ReorderSocialLinksDto } from '../dto/requests/reorder-social-links.dto';
import { SocialLinkResponseDto } from '../dto/responses/social-link-response.dto';

@ApiTags('stores')
@Controller('stores/me/social-links')
@UseGuards(StoreOwnerGuard)
export class SocialLinksController {
  constructor(private readonly socialLinks: SocialLinkService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserPayload): Promise<SocialLinkResponseDto[]> {
    const result = await this.socialLinks.list(user.id);
    return unwrapOrThrow(result).map((link) => SocialLinkResponseDto.fromDomain(link));
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSocialLinkDto,
  ): Promise<SocialLinkResponseDto> {
    const result = await this.socialLinks.add(user.id, dto);
    return SocialLinkResponseDto.fromDomain(unwrapOrThrow(result));
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: UpdateSocialLinkDto,
  ): Promise<{ updated: true }> {
    const result = await this.socialLinks.update(user.id, id, dto);
    unwrapOrThrow(result);
    return { updated: true };
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ): Promise<{ removed: true }> {
    const result = await this.socialLinks.remove(user.id, id);
    unwrapOrThrow(result);
    return { removed: true };
  }

  @Put('order')
  async reorder(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ReorderSocialLinksDto,
  ): Promise<SocialLinkResponseDto[]> {
    const result = await this.socialLinks.reorder(user.id, dto.orderedIds);
    return unwrapOrThrow(result).map((link) => SocialLinkResponseDto.fromDomain(link));
  }
}
