import { Inject, Injectable, Logger } from '@nestjs/common';
import { Result } from '../../../../shared/kernel/result';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { DomainEventPublisher } from '../../../../shared/infrastructure/events/domain-event-publisher';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { AppConfigService } from '../../../../shared/config/app-config.service';
import { STORAGE_UPLOADER, StorageUploader } from '../../../../shared/infrastructure/storage/storage-uploader.port';
import { ORDER_REPOSITORY, OrderRepository } from '../../../ordering/domain/repositories/order.repository';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../../catalog/domain/repositories/product.repository';
import { DigitalDelivery } from '../../domain/entities/digital-delivery.aggregate';
import { DIGITAL_DELIVERY_REPOSITORY, DigitalDeliveryRepository } from '../../domain/repositories/digital-delivery.repository';
import {
  BuyerDeliveryListItem,
  DIGITAL_DELIVERY_READ_REPOSITORY,
  DigitalDeliveryReadRepository,
} from '../../domain/repositories/digital-delivery-read.repository';
import { DeliveryNotFoundError, DownloadLimitReachedError } from '../../domain/errors/delivery.errors';

interface FileNameRow {
  file_name: string;
}

// provision-digital-delivery is idempotent on (order_item_id, file_path)
// (.docs/10-background-jobs.md §2) — existsForOrderItem is the guard.
@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @Inject(DIGITAL_DELIVERY_REPOSITORY) private readonly deliveries: DigitalDeliveryRepository,
    @Inject(DIGITAL_DELIVERY_READ_REPOSITORY) private readonly reads: DigitalDeliveryReadRepository,
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepository,
    @Inject(PRODUCT_REPOSITORY) private readonly products: ProductRepository,
    @Inject(STORAGE_UPLOADER) private readonly storage: StorageUploader,
    private readonly transactionManager: TransactionManager,
    private readonly events: DomainEventPublisher,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async provisionForOrder(orderId: string): Promise<void> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      this.logger.warn(`provision-digital-delivery: order ${orderId} not found`);
      return;
    }

    for (const item of order.items) {
      if (item.productTypeSnapshot !== 'digital') continue;

      const product = await this.products.findById(item.productId);
      if (!product) continue;

      for (const file of product.digitalFiles) {
        const alreadyProvisioned = await this.deliveries.existsForOrderItem(item.id, file.filePath);
        if (alreadyProvisioned) continue;

        const expiresAt = new Date(Date.now() + this.config.deliveryUrlTtlSeconds * 1_000);
        const deliveryResult = DigitalDelivery.provision({
          orderItemId: item.id,
          filePath: file.filePath,
          maxDownloads: file.maxDownloads,
          expiresAt,
        });
        if (deliveryResult.isErr()) {
          this.logger.warn(`Failed to provision delivery for order item ${item.id}: ${deliveryResult.unwrapErr().message}`);
          continue;
        }

        const delivery = deliveryResult.unwrap();
        await this.transactionManager.runInTransaction(() => this.deliveries.save(delivery));
        await this.events.publishAll(delivery.pullDomainEvents());
      }
    }
  }

  async issueDownloadUrl(
    deliveryId: string,
    buyerId: string,
  ): Promise<Result<{ url: string; fileName: string }, DeliveryNotFoundError | DownloadLimitReachedError>> {
    const delivery = await this.deliveries.findByIdForBuyer(deliveryId, buyerId);
    if (!delivery) return Result.err(new DeliveryNotFoundError());

    const result = delivery.recordDownload();
    if (result.isErr()) return Result.err(result.unwrapErr());

    await this.transactionManager.runInTransaction(() => this.deliveries.save(delivery));
    await this.events.publishAll(delivery.pullDomainEvents());

    const url = await this.storage.createSignedUrl({
      bucket: 'private',
      path: delivery.filePath,
      expiresInSeconds: this.config.deliveryUrlTtlSeconds,
    });
    const fileName = await this.resolveFileName(delivery.orderItemId, delivery.filePath);

    return Result.ok({ url, fileName });
  }

  async listForBuyer(buyerId: string): Promise<BuyerDeliveryListItem[]> {
    return this.reads.listForBuyer(buyerId);
  }

  private async resolveFileName(orderItemId: string, filePath: string): Promise<string> {
    const rows = await this.prisma.$queryRaw<FileNameRow[]>`
      SELECT df.file_name
      FROM order_items oi
      JOIN digital_files df ON df.product_id = oi.product_id AND df.file_path = ${filePath}
      WHERE oi.id = ${orderItemId}
      LIMIT 1
    `;
    return rows[0]?.file_name ?? filePath.split('/').pop() ?? 'file';
  }
}
