import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { Slug } from '../../../../shared/kernel/value-objects/slug.vo';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { Product } from '../../domain/entities/product.aggregate';
import { ProductType } from '../../domain/value-objects/product-type.vo';
import { StockLevel } from '../../domain/value-objects/stock-level.vo';
import {
  PRODUCT_REPOSITORY,
  ProductListFilter,
  ProductListResult,
  ProductRepository,
} from '../../domain/repositories/product.repository';
import {
  DigitalProductRequiresFileError,
  InvalidProductError,
  InvalidSlugError,
  ProductNotFoundError,
  SlugTakenError,
} from '../../domain/errors/catalog.errors';

const MAX_SLUG_SUFFIX_ATTEMPTS = 5;

type CreateProductError = InvalidSlugError | SlugTakenError | InvalidProductError;
type UpdateProductError = ProductNotFoundError | InvalidSlugError | SlugTakenError | InvalidProductError;

export interface CreateProductInput {
  name: string;
  slug?: string;
  description?: string | null;
  price: string;
  hpp?: string | null;
  productType: string;
  stock?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  slug?: string;
  description?: string | null;
  price?: string;
  hpp?: string | null;
  stock?: number | null;
}

@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
  ) {}

  async list(storeId: string, filter: ProductListFilter): Promise<ProductListResult> {
    return this.products.listByStore(storeId, filter);
  }

  async getById(storeId: string, productId: string): Promise<Result<Product, ProductNotFoundError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());
    return Result.ok(product);
  }

  async create(storeId: string, params: CreateProductInput): Promise<Result<Product, CreateProductError>> {
    const priceResult = Money.fromString(params.price);
    if (priceResult.isErr()) return Result.err(new InvalidProductError(priceResult.unwrapErr().message));

    let hpp: Money | null = null;
    if (params.hpp !== undefined && params.hpp !== null) {
      const hppResult = Money.fromString(params.hpp);
      if (hppResult.isErr()) return Result.err(new InvalidProductError(hppResult.unwrapErr().message));
      hpp = hppResult.unwrap();
    }

    const productTypeResult = ProductType.create(params.productType);
    if (productTypeResult.isErr()) return Result.err(new InvalidProductError(productTypeResult.unwrapErr().message));

    const stockResult = StockLevel.create(params.stock ?? null);
    if (stockResult.isErr()) return Result.err(new InvalidProductError(stockResult.unwrapErr().message));

    const slugResult = await this.resolveSlugForCreate(storeId, params.name, params.slug);
    if (slugResult.isErr()) return Result.err(slugResult.unwrapErr());

    const productResult = Product.create(storeId, {
      name: params.name,
      slug: slugResult.unwrap(),
      description: params.description ?? null,
      price: priceResult.unwrap(),
      hpp,
      productType: productTypeResult.unwrap(),
      stock: stockResult.unwrap(),
    });
    if (productResult.isErr()) return Result.err(productResult.unwrapErr());
    const product = productResult.unwrap();

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    return Result.ok(product);
  }

  async update(
    storeId: string,
    productId: string,
    params: UpdateProductInput,
  ): Promise<Result<Product, UpdateProductError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());

    let price: Money | undefined;
    if (params.price !== undefined) {
      const priceResult = Money.fromString(params.price);
      if (priceResult.isErr()) return Result.err(new InvalidProductError(priceResult.unwrapErr().message));
      price = priceResult.unwrap();
    }

    let hpp: Money | null | undefined;
    if (params.hpp !== undefined) {
      if (params.hpp === null) {
        hpp = null;
      } else {
        const hppResult = Money.fromString(params.hpp);
        if (hppResult.isErr()) return Result.err(new InvalidProductError(hppResult.unwrapErr().message));
        hpp = hppResult.unwrap();
      }
    }

    const updateResult = product.updateDetails({
      name: params.name,
      description: params.description,
      price,
      hpp,
    });
    if (updateResult.isErr()) return Result.err(updateResult.unwrapErr());

    if (params.stock !== undefined) {
      const stockResult = StockLevel.create(params.stock);
      if (stockResult.isErr()) return Result.err(new InvalidProductError(stockResult.unwrapErr().message));
      product.changeStock(stockResult.unwrap());
    }

    if (params.slug !== undefined && params.slug !== product.slug.value) {
      const slugResult = Slug.create(params.slug);
      if (slugResult.isErr()) return Result.err(new InvalidSlugError(slugResult.unwrapErr().message));
      const nextSlug = slugResult.unwrap();
      const exists = await this.products.existsBySlug(storeId, nextSlug.value);
      if (exists) return Result.err(new SlugTakenError(nextSlug.value));
      product.changeSlug(nextSlug);
    }

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    return Result.ok(product);
  }

  async publish(
    storeId: string,
    productId: string,
  ): Promise<Result<Product, ProductNotFoundError | DigitalProductRequiresFileError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());

    const result = product.publish();
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    return Result.ok(product);
  }

  async archive(storeId: string, productId: string): Promise<Result<Product, ProductNotFoundError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());

    product.archive();

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    return Result.ok(product);
  }

  private async resolveSlugForCreate(
    storeId: string,
    name: string,
    explicitSlug?: string,
  ): Promise<Result<Slug, InvalidSlugError | SlugTakenError>> {
    if (explicitSlug) {
      const slugResult = Slug.create(explicitSlug);
      if (slugResult.isErr()) return Result.err(new InvalidSlugError(slugResult.unwrapErr().message));
      const slug = slugResult.unwrap();
      const exists = await this.products.existsBySlug(storeId, slug.value);
      if (exists) return Result.err(new SlugTakenError(slug.value));
      return Result.ok(slug);
    }

    const baseResult = Slug.fromName(name);
    if (baseResult.isErr()) return Result.err(new InvalidSlugError(baseResult.unwrapErr().message));
    const base = baseResult.unwrap();

    const baseExists = await this.products.existsBySlug(storeId, base.value);
    if (!baseExists) return Result.ok(base);

    for (let suffix = 2; suffix <= MAX_SLUG_SUFFIX_ATTEMPTS + 1; suffix += 1) {
      const candidate = base.withSuffix(suffix);
      const exists = await this.products.existsBySlug(storeId, candidate.value);
      if (!exists) return Result.ok(candidate);
    }

    return Result.err(new SlugTakenError(base.value));
  }
}
