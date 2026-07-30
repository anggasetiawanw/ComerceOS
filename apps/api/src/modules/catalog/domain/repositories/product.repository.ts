import { UniqueId } from '../../../../shared/kernel/uuid';
import { ProductStatusValue } from '../value-objects/product-status.vo';
import { ProductTypeValue } from '../value-objects/product-type.vo';
import { Product } from '../entities/product.aggregate';

export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');

export interface ProductListFilter {
  status?: ProductStatusValue;
  productType?: ProductTypeValue;
  search?: string;
  page: number;
  limit: number;
}

export interface ProductListResult {
  items: Product[];
  total: number;
}

export interface ProductRepository {
  findById(id: UniqueId): Promise<Product | null>;
  findByIdForStore(storeId: string, id: UniqueId): Promise<Product | null>;
  findBySlug(storeId: string, slug: string): Promise<Product | null>;
  existsBySlug(storeId: string, slug: string): Promise<boolean>;
  listByStore(storeId: string, filter: ProductListFilter): Promise<ProductListResult>;
  save(product: Product): Promise<void>;
}
