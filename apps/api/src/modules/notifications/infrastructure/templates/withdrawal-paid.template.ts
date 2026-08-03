import { formatRupiah } from '@nagihin/contracts';
import { RenderedMessage } from '../../application/ports/notification-channel.port';

export interface WithdrawalPaidPayload {
  sellerName: string;
  storeName: string;
  amountRupiah: string;
}

export const isWithdrawalPaidPayload = (payload: unknown): payload is WithdrawalPaidPayload => {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    typeof record.sellerName === 'string' &&
    typeof record.storeName === 'string' &&
    typeof record.amountRupiah === 'string'
  );
};

export const renderWithdrawalPaid = (payload: WithdrawalPaidPayload): RenderedMessage => ({
  subject: `Penarikan ${payload.storeName} sudah ditransfer`,
  html: `<p>Halo ${payload.sellerName},</p><p>Penarikan sebesar <strong>${formatRupiah(payload.amountRupiah)}</strong> untuk toko ${payload.storeName} sudah ditransfer ke rekening kamu.</p>`,
});
