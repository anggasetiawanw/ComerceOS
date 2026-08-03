import { InvoiceViewModel } from '@nagihin/contracts';
import { Invoice } from './invoice.aggregate';
import { InvoiceNumber } from '../value-objects/invoice-number.vo';

const buildSnapshot = (): InvoiceViewModel => ({
  invoiceNumber: 'INV-00001',
  issuedAtIso: new Date('2026-08-03T00:00:00.000Z').toISOString(),
  store: { displayName: 'Toko Awal', username: 'tokoawal' },
  buyer: { name: 'Budi', email: 'budi@example.com' },
  order: { orderNumber: 'ORD-260803-ABCDEF', paidAtIso: new Date('2026-08-03T01:00:00.000Z').toISOString() },
  items: [{ name: 'Produk A', qty: 1, priceRupiah: '100000', subtotalRupiah: '100000' }],
  subtotalRupiah: '100000',
  discountRupiah: '0',
  totalRupiah: '100000',
});

describe('Invoice', () => {
  it('fromOrder snapshots the line items and emits InvoiceGenerated', () => {
    const snapshot = buildSnapshot();
    const invoice = Invoice.fromOrder({
      orderId: 'order-1',
      storeId: 'store-1',
      invoiceNumber: InvoiceNumber.fromCounter(1),
      snapshot,
    });

    expect(invoice.snapshot.items).toHaveLength(1);
    expect(invoice.snapshot.store.displayName).toBe('Toko Awal');
    expect(invoice.isRendered).toBe(false);

    const events = invoice.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe('invoicing.invoice_generated');
  });

  it('a later mutation of the source snapshot object does not alter the stored one', () => {
    const snapshot = buildSnapshot();
    const invoice = Invoice.fromOrder({
      orderId: 'order-1',
      storeId: 'store-1',
      invoiceNumber: InvoiceNumber.fromCounter(1),
      snapshot,
    });

    // Simulates "a later product rename": the source object mutates, but
    // the invoice's own snapshot must not follow it.
    snapshot.items[0]!.name = 'Produk A (renamed)';
    snapshot.store.displayName = 'Toko Baru';

    expect(invoice.snapshot.items[0]?.name).toBe('Produk A');
    expect(invoice.snapshot.store.displayName).toBe('Toko Awal');
  });

  it('markRendered sets pdfUrl and renderedAt', () => {
    const invoice = Invoice.fromOrder({
      orderId: 'order-1',
      storeId: 'store-1',
      invoiceNumber: InvoiceNumber.fromCounter(1),
      snapshot: buildSnapshot(),
    });

    invoice.markRendered('https://storage.local/invoices/store-1/INV-00001.pdf');
    expect(invoice.pdfUrl).toBe('https://storage.local/invoices/store-1/INV-00001.pdf');
    expect(invoice.isRendered).toBe(true);
  });
});
