import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { StorefrontReadRepository, StorefrontStoreRow } from '../../application/ports/storefront-read.repository';

@Injectable()
export class StorefrontReadPrismaRepository implements StorefrontReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<StorefrontStoreRow | null> {
    return this.prisma.store.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        bannerUrl: true,
        theme: true,
        plan: true,
        socialLinks: {
          select: { id: true, platform: true, url: true, position: true },
          orderBy: { position: 'asc' },
        },
      },
    });
  }
}
