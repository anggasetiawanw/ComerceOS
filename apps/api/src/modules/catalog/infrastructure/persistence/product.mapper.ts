import { Prisma, Product as PrismaProduct, DigitalFile as PrismaDigitalFile } from '@prisma/client';
import { Product } from '../../domain/entities/product.aggregate';
import { Slug } from '../../../../shared/kernel/value-objects/slug.vo';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { ProductType } from '../../domain/value-objects/product-type.vo';
import { ProductStatus } from '../../domain/value-objects/product-status.vo';
import { StockLevel } from '../../domain/value-objects/stock-level.vo';
import { ProductImages } from '../../domain/value-objects/product-images.vo';
import { DigitalFileMapper } from './digital-file.mapper';

export type PrismaProductWithFiles = PrismaProduct & { digitalFiles: PrismaDigitalFile[] };

export class ProductMapper {
  static toDomain(row: PrismaProductWithFiles): Product {
    const slugResult = Slug.create(row.slug);
    if (slugResult.isErr()) {
      throw new Error(`Corrupt product row: invalid slug "${row.slug}" for product "${row.id}"`);
    }

    const priceResult = Money.fromRupiah(row.price);
    if (priceResult.isErr()) {
      throw new Error(`Corrupt product row: invalid price for product "${row.id}"`);
    }

    let hpp = null;
    if (row.hpp !== null) {
      const hppResult = Money.fromRupiah(row.hpp);
      if (hppResult.isErr()) {
        throw new Error(`Corrupt product row: invalid hpp for product "${row.id}"`);
      }
      hpp = hppResult.unwrap();
    }

    const productTypeResult = ProductType.create(row.productType);
    if (productTypeResult.isErr()) {
      throw new Error(`Corrupt product row: invalid product type "${row.productType}" for product "${row.id}"`);
    }

    const statusResult = ProductStatus.create(row.status);
    if (statusResult.isErr()) {
      throw new Error(`Corrupt product row: invalid status "${row.status}" for product "${row.id}"`);
    }

    const stockResult = StockLevel.create(row.stock);
    if (stockResult.isErr()) {
      throw new Error(`Corrupt product row: invalid stock for product "${row.id}"`);
    }

    const imagesResult = ProductImages.create(row.images);
    if (imagesResult.isErr()) {
      throw new Error(`Corrupt product row: invalid images for product "${row.id}"`);
    }

    const digitalFiles = row.digitalFiles.map((file) => DigitalFileMapper.toDomain(file));

    return Product.reconstitute(
      {
        storeId: row.storeId,
        name: row.name,
        slug: slugResult.unwrap(),
        description: row.description,
        price: priceResult.unwrap(),
        hpp,
        productType: productTypeResult.unwrap(),
        stock: stockResult.unwrap(),
        images: imagesResult.unwrap(),
        status: statusResult.unwrap(),
        digitalFiles,
        createdAt: row.createdAt,
      },
      row.id,
    );
  }

  static toPersistenceCreate(product: Product): Prisma.ProductUncheckedCreateInput {
    return {
      id: product.id,
      storeId: product.storeId,
      name: product.name,
      slug: product.slug.value,
      description: product.description,
      price: product.price.amount,
      hpp: product.hpp?.amount ?? null,
      productType: product.productType.value,
      stock: product.stock.value,
      images: product.images.toJSON(),
      status: product.status.value,
      createdAt: product.createdAt,
    };
  }

  static toPersistenceUpdate(product: Product): Prisma.ProductUncheckedUpdateInput {
    return {
      name: product.name,
      slug: product.slug.value,
      description: product.description,
      price: product.price.amount,
      hpp: product.hpp?.amount ?? null,
      productType: product.productType.value,
      stock: product.stock.value,
      images: product.images.toJSON(),
      status: product.status.value,
    };
  }
}
