import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import {
  StorefrontProductRow,
  StorefrontReadRepository,
  StorefrontStoreRow,
} from '../../application/ports/storefront-read.repository';

const STOREFRONT_PRODUCTS_LIMIT = 24;

const PRODUCT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  price: true,
  productType: true,
  stock: true,
  images: true,
} as const;

interface RawProductRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: bigint;
  productType: string;
  stock: number | null;
  images: unknown;
}

const extractImageUrls = (images: unknown): string[] => {
  if (!Array.isArray(images)) return [];
  return images
    .filter((entry): entry is { url: unknown } => typeof entry === 'object' && entry !== null && 'url' in entry)
    .map((entry) => entry.url)
    .filter((url): url is string => typeof url === 'string');
};

const toStorefrontProductRow = (row: RawProductRow): StorefrontProductRow => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  price: row.price.toString(),
  productType: row.productType,
  stock: row.stock,
  imageUrls: extractImageUrls(row.images),
});

@Injectable()
export class StorefrontReadPrismaRepository implements StorefrontReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string): Promise<StorefrontStoreRow | null> {
    const row = await this.prisma.store.findUnique({
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
        products: {
          where: { status: 'active' },
          select: PRODUCT_SELECT,
          orderBy: { createdAt: 'desc' },
          take: STOREFRONT_PRODUCTS_LIMIT,
        },
      },
    });
    if (!row) return null;

    return {
      ...row,
      products: row.products.map(toStorefrontProductRow),
    };
  }

  async findProductBySlug(username: string, slug: string): Promise<StorefrontProductRow | null> {
    const row = await this.prisma.product.findFirst({
      where: { slug, status: 'active', store: { username } },
      select: PRODUCT_SELECT,
    });
    return row ? toStorefrontProductRow(row) : null;
  }

  async findUsernameByStoreId(storeId: string): Promise<string | null> {
    const row = await this.prisma.store.findUnique({ where: { id: storeId }, select: { username: true } });
    return row?.username ?? null;
  }
}
