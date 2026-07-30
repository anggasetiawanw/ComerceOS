import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { STORAGE_UPLOADER, StorageUploader } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { DigitalFile } from '../../domain/entities/digital-file.entity';
import { MAX_DIGITAL_FILES } from '../../domain/entities/product.aggregate';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../domain/repositories/product.repository';
import {
  DigitalFileLimitExceededError,
  DigitalFileNotFoundError,
  InvalidProductError,
  LastDigitalFileRequiredError,
  ProductNotFoundError,
} from '../../domain/errors/catalog.errors';

@Injectable()
export class DigitalFileService {
  constructor(
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader,
    private readonly config: AppConfigService,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
  ) {}

  async list(storeId: string, productId: string): Promise<Result<readonly DigitalFile[], ProductNotFoundError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());
    return Result.ok(product.digitalFiles);
  }

  async upload(
    storeId: string,
    productId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<Result<DigitalFile, ProductNotFoundError | DigitalFileLimitExceededError | InvalidProductError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());

    if (product.digitalFiles.length >= MAX_DIGITAL_FILES) {
      return Result.err(new DigitalFileLimitExceededError(MAX_DIGITAL_FILES));
    }

    const fileId = randomUUID();
    const objectPath = `stores/${storeId}/products/${productId}/files/${fileId}-${file.originalname}`;

    const uploaded = await this.storage.upload({
      bucket: 'private',
      path: objectPath,
      contentType: file.mimetype,
      body: file.buffer,
    });

    const digitalFileResult = DigitalFile.create({
      productId,
      filePath: uploaded.path,
      fileName: file.originalname,
      sizeBytes: file.buffer.length,
      contentType: file.mimetype,
      maxDownloads: this.config.digitalFileMaxDownloads,
    });
    if (digitalFileResult.isErr()) {
      return Result.err(new InvalidProductError(digitalFileResult.unwrapErr().message));
    }
    const digitalFile = digitalFileResult.unwrap();

    const attachResult = product.attachDigitalFile(digitalFile);
    if (attachResult.isErr()) return Result.err(attachResult.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    return Result.ok(digitalFile);
  }

  async remove(
    storeId: string,
    productId: string,
    fileId: string,
  ): Promise<Result<void, ProductNotFoundError | DigitalFileNotFoundError | LastDigitalFileRequiredError>> {
    const product = await this.products.findById(productId);
    if (!product || !product.belongsTo(storeId)) return Result.err(new ProductNotFoundError());

    const file = product.digitalFiles.find((candidate) => candidate.id === fileId);
    const result = product.removeDigitalFile(fileId);
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.products.save(product));
    await this.events.publishAll(product.pullDomainEvents());

    if (file) {
      await this.storage.remove({ bucket: 'private', path: file.filePath });
    }

    return Result.ok(undefined);
  }
}
