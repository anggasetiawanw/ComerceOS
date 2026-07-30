import { SocialLink } from '../../../domain/entities/social-link.entity';

export class SocialLinkResponseDto {
  id!: string;
  platform!: string;
  url!: string;
  position!: number;

  static fromDomain(link: SocialLink): SocialLinkResponseDto {
    const dto = new SocialLinkResponseDto();
    dto.id = link.id;
    dto.platform = link.platform.value;
    dto.url = link.url;
    dto.position = link.position;
    return dto;
  }
}
