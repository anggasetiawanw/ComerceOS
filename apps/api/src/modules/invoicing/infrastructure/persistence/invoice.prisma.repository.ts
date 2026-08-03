import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { Invoice } from '../../domain/entities/invoice.aggregate';
import { InvoiceRepository } from '../../domain/repositories/invoice.repository';
import { InvoiceMapper } from './invoice.mapper';

@Injectable()
export class InvoicePrismaRepository implements InvoiceRepository {
  constructor(private readonly transactionManager: TransactionManager) {}

  async findByOrderId(orderId: string): Promise<Invoice | null> {
    const row = await this.transactionManager.client.invoice.findUnique({ where: { orderId } });
    return row ? InvoiceMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<Invoice | null> {
    const row = await this.transactionManager.client.invoice.findUnique({ where: { id } });
    return row ? InvoiceMapper.toDomain(row) : null;
  }

  async save(invoice: Invoice): Promise<void> {
    await this.transactionManager.client.invoice.upsert({
      where: { id: invoice.id },
      create: InvoiceMapper.toPersistenceCreate(invoice),
      update: InvoiceMapper.toPersistenceUpdate(invoice),
    });
  }
}
