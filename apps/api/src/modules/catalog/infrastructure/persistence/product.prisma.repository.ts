import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { UniqueId } from '../../../../shared/kernel/uuid';
import { Product } from '../../domain/entities/product.aggregate';
import {
  ProductListFilter,
  ProductListResult,
  ProductRepository,
} from '../../domain/repositories/product.repository';
import { PrismaProductWithFiles, ProductMapper } from './product.mapper';
import { DigitalFileMapper } from './digital-file.mapper';

const DIGITAL_FILES_INCLUDE = { digitalFiles: true };

@Injectable()
export class ProductPrismaRepository implements ProductRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findById(id: UniqueId): Promise<Product | null> {
    const row: PrismaProductWithFiles | null = await this.transactionManager.client.product.findUnique({
      where: { id },
      include: DIGITAL_FILES_INCLUDE,
    });
    return row ? ProductMapper.toDomain(row) : null;
  }

  async findByIdForStore(storeId: string, id: UniqueId): Promise<Product | null> {
    const row: PrismaProductWithFiles | null = await this.transactionManager.client.product.findFirst({
      where: { id, storeId },
      include: DIGITAL_FILES_INCLUDE,
    });
    return row ? ProductMapper.toDomain(row) : null;
  }

  async findBySlug(storeId: string, slug: string): Promise<Product | null> {
    const row: PrismaProductWithFiles | null = await this.transactionManager.client.product.findUnique({
      where: { storeId_slug: { storeId, slug } },
      include: DIGITAL_FILES_INCLUDE,
    });
    return row ? ProductMapper.toDomain(row) : null;
  }

  async existsBySlug(storeId: string, slug: string): Promise<boolean> {
    const count = await this.transactionManager.client.product.count({ where: { storeId, slug } });
    return count > 0;
  }

  async listByStore(storeId: string, filter: ProductListFilter): Promise<ProductListResult> {
    const where: Prisma.ProductWhereInput = {
      storeId,
      status: filter.status,
      productType: filter.productType,
      name: filter.search ? { contains: filter.search, mode: 'insensitive' } : undefined,
    };

    const [rows, total] = await Promise.all([
      this.transactionManager.client.product.findMany({
        where,
        include: DIGITAL_FILES_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.transactionManager.client.product.count({ where }),
    ]);

    return {
      items: rows.map((row: PrismaProductWithFiles) => ProductMapper.toDomain(row)),
      total,
    };
  }

  async save(product: Product): Promise<void> {
    const data = {
      create: ProductMapper.toPersistenceCreate(product),
      update: ProductMapper.toPersistenceUpdate(product),
    };
    await this.transactionManager.client.product.upsert({
      where: { id: product.id },
      create: data.create,
      update: data.update,
    });

    for (const file of product.digitalFiles) {
      await this.transactionManager.client.digitalFile.upsert({
        where: { id: file.id },
        create: DigitalFileMapper.toPersistenceCreate(file),
        update: DigitalFileMapper.toPersistenceUpdate(file),
      });
    }

    const currentFileIds = product.digitalFiles.map((file) => file.id);
    await this.transactionManager.client.digitalFile.deleteMany({
      where: { productId: product.id, id: { notIn: currentFileIds } },
    });
  }
}
