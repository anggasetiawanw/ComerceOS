import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'whatsapp', 'youtube', 'other'] as const;

export class UpdateSocialLinkDto {
  @IsOptional()
  @IsIn(SOCIAL_PLATFORMS)
  platform?: (typeof SOCIAL_PLATFORMS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;
}
