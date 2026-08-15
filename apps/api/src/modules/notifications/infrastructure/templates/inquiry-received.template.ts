import { RenderedMessage } from '../../application/ports/notification-channel.port';

export interface InquiryReceivedPayload {
  storeName: string;
  productName: string | null;
  inquiryId: string;
}

export const isInquiryReceivedPayload = (payload: unknown): payload is InquiryReceivedPayload => {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    typeof record.storeName === 'string' &&
    (record.productName === null || typeof record.productName === 'string') &&
    typeof record.inquiryId === 'string'
  );
};

export const renderInquiryReceived = (payload: InquiryReceivedPayload): RenderedMessage => ({
  subject: `Pertanyaan baru di ${payload.storeName}`,
  html: payload.productName
    ? `<p>Ada yang menanyakan produk <strong>${payload.productName}</strong> lewat WhatsApp.</p><p>Lihat di /dashboard/pesanan/pertanyaan.</p>`
    : `<p>Ada pertanyaan baru lewat WhatsApp.</p><p>Lihat di /dashboard/pesanan/pertanyaan.</p>`,
});
