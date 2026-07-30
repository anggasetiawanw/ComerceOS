import { Prisma, SocialLink as PrismaSocialLink } from '@prisma/client';
import { SocialLink } from '../../domain/entities/social-link.entity';
import { SocialPlatform } from '../../domain/value-objects/social-platform.vo';

export class SocialLinkMapper {
  static toDomain(row: PrismaSocialLink): SocialLink {
    const platformResult = SocialPlatform.create(row.platform);
    if (platformResult.isErr()) {
      throw new Error(`Corrupt social link row: invalid platform "${row.platform}"`);
    }

    return SocialLink.reconstitute(
      {
        storeId: row.storeId,
        platform: platformResult.unwrap(),
        url: row.url,
        position: row.position,
      },
      row.id,
    );
  }

  static toPersistenceCreate(link: SocialLink): Prisma.SocialLinkUncheckedCreateInput {
    return {
      id: link.id,
      storeId: link.storeId,
      platform: link.platform.value,
      url: link.url,
      position: link.position,
    };
  }

  static toPersistenceUpdate(link: SocialLink): Prisma.SocialLinkUncheckedUpdateInput {
    return {
      platform: link.platform.value,
      url: link.url,
      position: link.position,
    };
  }
}
