import { StorefrontProduct } from '../../../application/services/storefront.service';

export class StorefrontProductResponseDto {
  id!: string;
  name!: string;
  slug!: string;
  description!: string | null;
  price!: string;
  productType!: string;
  stock!: number | null;
  imageUrls!: string[];

  static fromResult(product: StorefrontProduct): StorefrontProductResponseDto {
    const dto = new StorefrontProductResponseDto();
    dto.id = product.id;
    dto.name = product.name;
    dto.slug = product.slug;
    dto.description = product.description;
    dto.price = product.price;
    dto.productType = product.productType;
    dto.stock = product.stock;
    dto.imageUrls = product.imageUrls;
    return dto;
  }
}
