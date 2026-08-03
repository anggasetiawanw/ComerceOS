import { formatRupiah } from '@nagihin/contracts';
import { RenderedMessage } from '../../application/ports/notification-channel.port';

export interface OrderReleasedPayload {
  sellerName: string;
  storeName: string;
  orderNumber: string;
  amountRupiah: string;
}

export const isOrderReleasedPayload = (payload: unknown): payload is OrderReleasedPayload => {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    typeof record.sellerName === 'string' &&
    typeof record.storeName === 'string' &&
    typeof record.orderNumber === 'string' &&
    typeof record.amountRupiah === 'string'
  );
};

export const renderOrderReleased = (payload: OrderReleasedPayload): RenderedMessage => ({
  subject: `Dana pesanan ${payload.orderNumber} sudah cair`,
  html: `<p>Halo ${payload.sellerName},</p><p>Dana sebesar <strong>${formatRupiah(payload.amountRupiah)}</strong> dari pesanan ${payload.orderNumber} sudah dipindahkan ke saldo tersedia toko ${payload.storeName}.</p>`,
});
