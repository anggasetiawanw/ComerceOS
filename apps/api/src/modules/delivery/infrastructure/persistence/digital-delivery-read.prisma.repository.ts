import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { BuyerDeliveryListItem, DigitalDeliveryReadRepository } from '../../domain/repositories/digital-delivery-read.repository';

interface BuyerDeliveryRow {
  id: string;
  order_item_id: string;
  product_name: string;
  file_name: string | null;
  store_id: string;
  store_name: string;
  order_number: string;
  download_count: number;
  max_downloads: number;
  expires_at: Date;
}

@Injectable()
export class DigitalDeliveryReadPrismaRepository implements DigitalDeliveryReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForBuyer(buyerId: string): Promise<BuyerDeliveryListItem[]> {
    const rows = await this.prisma.$queryRaw<BuyerDeliveryRow[]>`
      SELECT dd.id, dd.order_item_id, oi.product_name_snapshot AS product_name, df.file_name,
             o.store_id, s.display_name AS store_name, o.order_number,
             dd.download_count, dd.max_downloads, dd.expires_at
      FROM digital_deliveries dd
      JOIN order_items oi ON oi.id = dd.order_item_id
      JOIN orders o ON o.id = oi.order_id
      JOIN stores s ON s.id = o.store_id
      LEFT JOIN digital_files df ON df.product_id = oi.product_id AND df.file_path = dd.file_path
      WHERE o.buyer_id = ${buyerId}
      ORDER BY dd.created_at DESC
    `;

    return rows.map((row) => ({
      id: row.id,
      orderItemId: row.order_item_id,
      productName: row.product_name,
      fileName: row.file_name,
      storeId: row.store_id,
      storeName: row.store_name,
      orderNumber: row.order_number,
      downloadCount: row.download_count,
      maxDownloads: row.max_downloads,
      expiresAt: row.expires_at,
    }));
  }
}
