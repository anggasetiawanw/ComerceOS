import { StorefrontResult } from '../../../application/services/storefront.service';
import { StorefrontSocialLinkResponseDto } from './storefront-social-link-response.dto';
import { StorefrontProductResponseDto } from './storefront-product-response.dto';

export class StorefrontResponseDto {
  id!: string;
  username!: string;
  displayName!: string;
  bio!: string | null;
  avatarUrl!: string | null;
  bannerUrl!: string | null;
  theme!: Record<string, string> | null;
  plan!: string;
  hasWhatsapp!: boolean;
  socialLinks!: StorefrontSocialLinkResponseDto[];
  products!: StorefrontProductResponseDto[];

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
    dto.hasWhatsapp = result.hasWhatsapp;
    dto.socialLinks = result.socialLinks.map((link) => StorefrontSocialLinkResponseDto.fromResult(link));
    dto.products = result.products.map((product) => StorefrontProductResponseDto.fromResult(product));
    return dto;
  }
}
