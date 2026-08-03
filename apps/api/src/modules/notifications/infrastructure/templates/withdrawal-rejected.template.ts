import { formatRupiah } from '@nagihin/contracts';
import { RenderedMessage } from '../../application/ports/notification-channel.port';

export interface WithdrawalRejectedPayload {
  sellerName: string;
  storeName: string;
  amountRupiah: string;
  reason: string | null;
}

export const isWithdrawalRejectedPayload = (payload: unknown): payload is WithdrawalRejectedPayload => {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    typeof record.sellerName === 'string' &&
    typeof record.storeName === 'string' &&
    typeof record.amountRupiah === 'string' &&
    (record.reason === null || typeof record.reason === 'string')
  );
};

export const renderWithdrawalRejected = (payload: WithdrawalRejectedPayload): RenderedMessage => ({
  subject: `Penarikan ${payload.storeName} ditolak`,
  html: `<p>Halo ${payload.sellerName},</p><p>Penarikan sebesar <strong>${formatRupiah(payload.amountRupiah)}</strong> untuk toko ${payload.storeName} ditolak.</p>${payload.reason ? `<p>Alasan: ${payload.reason}</p>` : ''}<p>Saldo kamu tidak berkurang.</p>`,
});
