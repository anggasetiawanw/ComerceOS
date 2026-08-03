import { formatRupiah } from '@nagihin/contracts';
import { RenderedMessage } from '../../application/ports/notification-channel.port';

export interface WithdrawalRequestedPayload {
  storeName: string;
  amountRupiah: string;
  withdrawalId: string;
}

export const isWithdrawalRequestedPayload = (payload: unknown): payload is WithdrawalRequestedPayload => {
  if (typeof payload !== 'object' || payload === null) return false;
  const record = payload as Record<string, unknown>;
  return (
    typeof record.storeName === 'string' &&
    typeof record.amountRupiah === 'string' &&
    typeof record.withdrawalId === 'string'
  );
};

export const renderWithdrawalRequested = (payload: WithdrawalRequestedPayload): RenderedMessage => ({
  subject: `Penarikan baru dari ${payload.storeName}`,
  html: `<p>Toko <strong>${payload.storeName}</strong> mengajukan penarikan sebesar <strong>${formatRupiah(payload.amountRupiah)}</strong>.</p><p>Tinjau di /admin/penarikan.</p>`,
});
