import { IsIn, IsString, MaxLength } from 'class-validator';

const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'whatsapp', 'youtube', 'other'] as const;

export class CreateSocialLinkDto {
  @IsIn(SOCIAL_PLATFORMS)
  platform!: (typeof SOCIAL_PLATFORMS)[number];

  @IsString()
  @MaxLength(2048)
  url!: string;
}
