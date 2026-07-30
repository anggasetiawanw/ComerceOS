import { Product } from '../../../domain/entities/product.aggregate';

export class ProductImageResponseDto {
  id!: string;
  url!: string;
}

export class ProductResponseDto {
  id!: string;
  storeId!: string;
  name!: string;
  slug!: string;
  description!: string | null;
  price!: string;
  hpp!: string | null;
  productType!: string;
  stock!: number | null;
  status!: string;
  images!: ProductImageResponseDto[];
  digitalFileCount!: number;
  createdAt!: Date;

  static fromDomain(product: Product): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = product.id;
    dto.storeId = product.storeId;
    dto.name = product.name;
    dto.slug = product.slug.value;
    dto.description = product.description;
    dto.price = product.price.toString();
    dto.hpp = product.hpp ? product.hpp.toString() : null;
    dto.productType = product.productType.value;
    dto.stock = product.stock.value;
    dto.status = product.status.value;
    dto.images = product.images.items.map((image) => ({ id: image.id, url: image.url }));
    dto.digitalFileCount = product.digitalFiles.length;
    dto.createdAt = product.createdAt;
    return dto;
  }
}
