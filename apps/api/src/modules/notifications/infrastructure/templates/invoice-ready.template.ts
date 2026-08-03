import { formatRupiah } from '@nagihin/contracts';
import { RenderedMessage } from '../../application/ports/notification-channel.port';

export interface InvoiceReadyPayload {
  buyerName: string;
  storeName: string;
  invoiceNumber: string;
  totalRupiah: string;
}

// Not a blind cast: the persisted payload column round-trips through JSON,
// so this is the "Corrupt row" reconstruction pattern (see mappers under
// infrastructure/persistence/) applied to a job payload instead of a
// database row.
export const isInvoiceReadyPayload = (payload: unknown): payload is InvoiceReadyPayload => {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    typeof record.buyerName === 'string' &&
    typeof record.storeName === 'string' &&
    typeof record.invoiceNumber === 'string' &&
    typeof record.totalRupiah === 'string'
  );
};

export const renderInvoiceReady = (payload: InvoiceReadyPayload): RenderedMessage => ({
  subject: `Invoice ${payload.invoiceNumber} dari ${payload.storeName}`,
  html: `<p>Halo ${payload.buyerName},</p><p>Invoice <strong>${payload.invoiceNumber}</strong> untuk pesanan Anda di ${payload.storeName} sudah siap. Total: ${formatRupiah(payload.totalRupiah)}.</p><p>Invoice terlampir dalam email ini.</p>`,
});
