import { Injectable } from '@nestjs/common';
import { TransactionManager } from '../../../../shared/infrastructure/prisma/transaction.manager';
import { InvoiceNumberAllocator } from '../../application/ports/invoice-number-allocator.port';

// The only file that writes stores.invoice_counter
// (apps/api/src/architecture.spec.ts enforces this). UPDATE ... RETURNING
// takes the row lock implicitly and is atomic — no separate SELECT ... FOR
// UPDATE, no COUNT(*) + 1, no global sequence.
@Injectable()
export class InvoiceNumberPrismaAllocator implements InvoiceNumberAllocator {
  constructor(private readonly transactionManager: TransactionManager) {}

  async allocate(storeId: string): Promise<number> {
    const rows = await this.transactionManager.client.$queryRaw<{ invoice_counter: number }[]>`
      UPDATE stores SET invoice_counter = invoice_counter + 1 WHERE id = ${storeId}
      RETURNING invoice_counter
    `;
    const row = rows[0];
    if (!row) {
      throw new Error(`Cannot allocate an invoice number: store "${storeId}" not found`);
    }
    return row.invoice_counter;
  }
}
