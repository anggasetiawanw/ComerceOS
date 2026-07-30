import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { STORAGE_UPLOADER, StorageUploader } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import { MAX_PRODUCT_IMAGES, Product } from '../../domain/entities/product.aggregate';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../domain/repositories/product.repository';
import {
  ProductImageLimitExceededError,
  ProductImageNotFoundError,
  ProductNotFoundError,
} from '../../domain/errors/catalog.errors';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ProductMediaService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
  ) {}

  async uploadImage(
    storeId: string,
    productId: string,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<Result<Product, ProductNotFoundError | ProductImageLimitExceededError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());

    if (product.images.count >= MAX_PRODUCT_IMAGES) {
      return Result.err(new ProductImageLimitExceededError(MAX_PRODUCT_IMAGES));
    }

    const extension = EXTENSION_BY_MIME[file.mimetype] ?? 'bin';
    const imageId = randomUUID();
    const objectPath = `stores/${storeId}/products/${productId}/images/${imageId}.${extension}`;

    const uploaded = await this.storage.upload({
      bucket: 'public',
      path: objectPath,
      contentType: file.mimetype,
      body: file.buffer,
    });

    const result = product.addImage({ id: imageId, path: uploaded.path, url: uploaded.url });
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    return Result.ok(product);
  }

  async removeImage(
    storeId: string,
    productId: string,
    imageId: string,
  ): Promise<Result<Product, ProductNotFoundError | ProductImageNotFoundError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());

    const image = product.images.items.find((item) => item.id === imageId);
    const result = product.removeImage(imageId);
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    if (image) {
      await this.storage.remove({ bucket: 'public', path: image.path });
    }

    return Result.ok(product);
  }
}
