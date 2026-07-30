import { AggregateRoot } from '../../../../shared/kernel/aggregate-root.base';
import { Result } from '../../../../shared/kernel/result';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Money } from '../../../../shared/kernel/value-objects/money.vo';
import { Slug } from '../../../../shared/kernel/value-objects/slug.vo';
import { ProductType } from '../value-objects/product-type.vo';
import { ProductStatus } from '../value-objects/product-status.vo';
import { StockLevel } from '../value-objects/stock-level.vo';
import { ProductImages, ProductImage } from '../value-objects/product-images.vo';
import { DigitalFile } from './digital-file.entity';
import { ProductCreatedEvent } from '../events/product-created.event';
import { ProductUpdatedEvent } from '../events/product-updated.event';
import { ProductArchivedEvent } from '../events/product-archived.event';
import { ProductStockDepletedEvent } from '../events/product-stock-depleted.event';
import { DigitalFileAttachedEvent } from '../events/digital-file-attached.event';
import {
  DigitalFileLimitExceededError,
  DigitalFileNotFoundError,
  DigitalProductRequiresFileError,
  InvalidProductError,
  LastDigitalFileRequiredError,
  ProductImageLimitExceededError,
  ProductImageNotFoundError,
} from '../errors/catalog.errors';

export const MAX_PRODUCT_IMAGES = 8;
export const MAX_DIGITAL_FILES = 5;

export interface ProductProps {
  storeId: string;
  name: string;
  slug: Slug;
  description: string | null;
  price: Money;
  hpp: Money | null;
  productType: ProductType;
  stock: StockLevel;
  images: ProductImages;
  status: ProductStatus;
  digitalFiles: DigitalFile[];
  createdAt: Date;
}

export class Product extends AggregateRoot<ProductProps> {
  private constructor(props: ProductProps, id?: UniqueId) {
    super(props, id);
  }

  static create(
    storeId: string,
    params: {
      name: string;
      slug: Slug;
      description?: string | null;
      price: Money;
      hpp?: Money | null;
      productType: ProductType;
      stock: StockLevel;
    },
  ): Result<Product, InvalidProductError> {
    const name = params.name.trim();
    if (name.length === 0) {
      return Result.err(new InvalidProductError('Product name cannot be empty'));
    }

    const product = new Product({
      storeId,
      name,
      slug: params.slug,
      description: params.description ?? null,
      price: params.price,
      hpp: params.hpp ?? null,
      productType: params.productType,
      stock: params.stock,
      images: ProductImages.empty(),
      status: ProductStatus.draft(),
      digitalFiles: [],
      createdAt: new Date(),
    });
    product.addDomainEvent(new ProductCreatedEvent(product.id, storeId, params.slug.value));
    return Result.ok(product);
  }

  static reconstitute(props: ProductProps, id: UniqueId): Product {
    return new Product(props, id);
  }

  get storeId(): string {
    return this.props.storeId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): Slug {
    return this.props.slug;
  }

  get description(): string | null {
    return this.props.description;
  }

  get price(): Money {
    return this.props.price;
  }

  get hpp(): Money | null {
    return this.props.hpp;
  }

  get productType(): ProductType {
    return this.props.productType;
  }

  get stock(): StockLevel {
    return this.props.stock;
  }

  get images(): ProductImages {
    return this.props.images;
  }

  get status(): ProductStatus {
    return this.props.status;
  }

  get digitalFiles(): readonly DigitalFile[] {
    return this.props.digitalFiles;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  belongsTo(storeId: string): boolean {
    return this.props.storeId === storeId;
  }

  updateDetails(params: {
    name?: string;
    description?: string | null;
    price?: Money;
    hpp?: Money | null;
  }): Result<void, InvalidProductError> {
    const name = params.name !== undefined ? params.name.trim() : this.props.name;
    if (name.length === 0) {
      return Result.err(new InvalidProductError('Product name cannot be empty'));
    }

    this.props.name = name;
    this.props.description = params.description !== undefined ? params.description : this.props.description;
    this.props.price = params.price ?? this.props.price;
    this.props.hpp = params.hpp !== undefined ? params.hpp : this.props.hpp;
    this.addDomainEvent(new ProductUpdatedEvent(this.id, this.props.storeId, this.props.slug.value));
    return Result.ok(undefined);
  }

  changeSlug(next: Slug): void {
    if (next.value === this.props.slug.value) return;
    const previous = this.props.slug;
    this.props.slug = next;
    this.addDomainEvent(
      new ProductUpdatedEvent(this.id, this.props.storeId, next.value, previous.value),
    );
  }

  changeStock(level: StockLevel): void {
    this.props.stock = level;
    this.addDomainEvent(new ProductUpdatedEvent(this.id, this.props.storeId, this.props.slug.value));
    if (level.isDepleted()) {
      this.addDomainEvent(
        new ProductStockDepletedEvent(this.id, this.props.storeId, this.props.slug.value),
      );
    }
  }

  publish(): Result<void, DigitalProductRequiresFileError> {
    if (this.props.status.isActive()) return Result.ok(undefined);

    if (this.props.productType.isDigital() && this.props.digitalFiles.length === 0) {
      return Result.err(new DigitalProductRequiresFileError());
    }

    this.props.status = ProductStatus.active();
    this.addDomainEvent(new ProductUpdatedEvent(this.id, this.props.storeId, this.props.slug.value));
    return Result.ok(undefined);
  }

  archive(): void {
    if (this.props.status.isArchived()) return;
    this.props.status = ProductStatus.archived();
    this.addDomainEvent(new ProductArchivedEvent(this.id, this.props.storeId, this.props.slug.value));
  }

  addImage(image: ProductImage): Result<void, ProductImageLimitExceededError> {
    if (this.props.images.count >= MAX_PRODUCT_IMAGES) {
      return Result.err(new ProductImageLimitExceededError(MAX_PRODUCT_IMAGES));
    }
    this.props.images = this.props.images.withAdded(image);
    this.addDomainEvent(new ProductUpdatedEvent(this.id, this.props.storeId, this.props.slug.value));
    return Result.ok(undefined);
  }

  removeImage(imageId: string): Result<void, ProductImageNotFoundError> {
    if (!this.props.images.has(imageId)) {
      return Result.err(new ProductImageNotFoundError());
    }
    this.props.images = this.props.images.withRemoved(imageId);
    this.addDomainEvent(new ProductUpdatedEvent(this.id, this.props.storeId, this.props.slug.value));
    return Result.ok(undefined);
  }

  attachDigitalFile(file: DigitalFile): Result<void, DigitalFileLimitExceededError> {
    if (this.props.digitalFiles.length >= MAX_DIGITAL_FILES) {
      return Result.err(new DigitalFileLimitExceededError(MAX_DIGITAL_FILES));
    }
    this.props.digitalFiles = [...this.props.digitalFiles, file];
    this.addDomainEvent(new DigitalFileAttachedEvent(this.id, this.props.storeId, file.id));
    return Result.ok(undefined);
  }

  removeDigitalFile(fileId: string): Result<void, DigitalFileNotFoundError | LastDigitalFileRequiredError> {
    const exists = this.props.digitalFiles.some((file) => file.id === fileId);
    if (!exists) return Result.err(new DigitalFileNotFoundError());

    const isLastFileOnActiveDigitalProduct =
      this.props.productType.isDigital() && this.props.status.isActive() && this.props.digitalFiles.length <= 1;
    if (isLastFileOnActiveDigitalProduct) {
      return Result.err(new LastDigitalFileRequiredError());
    }

    this.props.digitalFiles = this.props.digitalFiles.filter((file) => file.id !== fileId);
    this.addDomainEvent(new ProductUpdatedEvent(this.id, this.props.storeId, this.props.slug.value));
    return Result.ok(undefined);
  }
}
