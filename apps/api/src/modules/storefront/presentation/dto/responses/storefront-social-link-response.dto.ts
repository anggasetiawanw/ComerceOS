import { StorefrontSocialLink } from '../../../application/services/storefront.service';

export class StorefrontSocialLinkResponseDto {
  id!: string;
  platform!: string;
  url!: string;
  position!: number;

  static fromResult(link: StorefrontSocialLink): StorefrontSocialLinkResponseDto {
    const dto = new StorefrontSocialLinkResponseDto();
    dto.id = link.id;
    dto.platform = link.platform;
    dto.url = link.url;
    dto.position = link.position;
    return dto;
  }
}
