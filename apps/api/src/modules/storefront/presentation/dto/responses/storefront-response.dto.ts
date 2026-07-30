import { StorefrontResult } from '../../../application/services/storefront.service';
import { StorefrontSocialLinkResponseDto } from './storefront-social-link-response.dto';

export class StorefrontResponseDto {
  id!: string;
  username!: string;
  displayName!: string;
  bio!: string | null;
  avatarUrl!: string | null;
  bannerUrl!: string | null;
  theme!: Record<string, string> | null;
  plan!: string;
  socialLinks!: StorefrontSocialLinkResponseDto[];

  static fromResult(result: StorefrontResult): StorefrontResponseDto {
    const dto = new StorefrontResponseDto();
    dto.id = result.id;
    dto.username = result.username;
    dto.displayName = result.displayName;
    dto.bio = result.bio;
    dto.avatarUrl = result.avatarUrl;
    dto.bannerUrl = result.bannerUrl;
    dto.theme = result.theme;
    dto.plan = result.plan;
    dto.socialLinks = result.socialLinks.map((link) => StorefrontSocialLinkResponseDto.fromResult(link));
    return dto;
  }
}
