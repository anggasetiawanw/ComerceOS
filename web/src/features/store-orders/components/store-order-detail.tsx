'use client';

import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { MoneyDisplay } from '@/components/data/money-display';
import { OrderStatusBadge } from '@/components/data/order-status-badge';
import { Timeline, type TimelineEntry } from '@/components/data/timeline';
import { useConfirmPayment, useCancelOrder, useReleaseOrder } from '../hooks/use-order-actions';
import type { StoreOrderDetail as StoreOrderDetailType } from '../types/store-order.types';

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Pesanan dibuat',
  paid: 'Dibayar',
  holding: 'Dana masuk holding',
  released: 'Dana dicairkan',
  disputed: 'Bermasalah',
  refunded: 'Dana dikembalikan',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
};

const actorLabel = (actorType: string): string | null => {
  if (actorType === 'seller') return 'Kamu';
  if (actorType === 'buyer') return 'Pembeli';
  if (actorType === 'admin') return 'Admin';
  return null;
};

export const StoreOrderDetail = ({ order }: { order: StoreOrderDetailType }) => {
  const confirmPayment = useConfirmPayment();
  const cancelOrder = useCancelOrder();
  const releaseOrder = useReleaseOrder();

  const entries: TimelineEntry[] = order.statusHistory.map((entry, index) => ({
    id: `${entry.toStatus}-${index}`,
    label: STATUS_LABEL[entry.toStatus] ?? entry.toStatus,
    actorLabel: actorLabel(entry.actorType),
    reason: entry.reason,
    createdAt: entry.createdAt,
  }));

  const canConfirmPayment = order.source === 'manual' && order.status === 'pending_payment';
  const canCancel = order.status === 'pending_payment';
  const canRelease = order.status === 'holding';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">{formatWibDate(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{order.source === 'manual' ? 'Manual' : 'Checkout'}</Badge>
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {(canConfirmPayment || canCancel || canRelease) && (
        <div className="flex flex-wrap gap-2">
          {canConfirmPayment && (
            <ConfirmDialog
              trigger={<Button type="button">Konfirmasi pembayaran</Button>}
              title="Konfirmasi pembayaran diterima?"
              description="Tandai pesanan ini sebagai sudah dibayar. Dana akan masuk ke holding sesuai kebijakan settlement toko kamu."
              confirmLabel="Konfirmasi"
              onConfirm={async () => {
                await confirmPayment.mutateAsync(order.id);
              }}
            />
          )}
          {canRelease && (
            <ConfirmDialog
              trigger={<Button type="button" variant="outline">Cairkan dana</Button>}
              title="Cairkan dana sekarang?"
              description="Dana akan dipindahkan dari holding ke saldo tersedia. Hanya bisa dilakukan setelah masa holding berakhir."
              confirmLabel="Cairkan"
              onConfirm={async () => {
                await releaseOrder.mutateAsync(order.id);
              }}
            />
          )}
          {canCancel && (
            <ConfirmDialog
              trigger={<Button type="button" variant="outline">Batalkan</Button>}
              title="Batalkan pesanan ini?"
              description="Pesanan yang dibatalkan tidak bisa diaktifkan kembali."
              confirmLabel="Batalkan"
              destructive
              onConfirm={async () => {
                await cancelOrder.mutateAsync(order.id);
              }}
            />
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pembeli</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{order.buyerName ?? 'Tidak diketahui'}</span>
          <span className="text-muted-foreground">{order.buyerEmail}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 text-sm first:pt-0 last:pb-0">
              <div className="flex flex-col">
                <span>{item.productName}</span>
                <span className="text-xs text-muted-foreground">{item.qty}x</span>
              </div>
              <MoneyDisplay value={item.price} />
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <MoneyDisplay value={order.subtotal} />
          </div>
          {order.discountAmount !== '0' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Diskon</span>
              <span>-<MoneyDisplay value={order.discountAmount} /></span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Biaya platform</span>
            <MoneyDisplay value={order.feeAmount} />
          </div>
          <div className="flex items-center justify-between pt-1 font-medium">
            <span>Total</span>
            <MoneyDisplay value={order.total} />
          </div>
        </CardContent>
      </Card>

      {order.holdingUntil && (
        <Card>
          <CardContent className="flex items-center justify-between pt-6 text-sm">
            <span className="text-muted-foreground">Dana bisa dicairkan pada</span>
            <span className="font-medium">{formatWibDate(order.holdingUntil)}</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat</CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline entries={entries} />
        </CardContent>
      </Card>
    </div>
  );
};
