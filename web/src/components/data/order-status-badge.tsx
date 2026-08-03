import { Badge } from '@/components/ui/badge';
import type { OrderStatus } from '@/features/orders/types/order.types';

const VARIANT_BY_STATUS: Record<OrderStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending_payment: 'secondary',
  paid: 'default',
  holding: 'default',
  released: 'default',
  disputed: 'destructive',
  refunded: 'outline',
  cancelled: 'outline',
  expired: 'outline',
};

const LABEL_BY_STATUS: Record<OrderStatus, string> = {
  pending_payment: 'Menunggu pembayaran',
  paid: 'Dibayar',
  holding: 'Dana ditahan',
  released: 'Selesai',
  disputed: 'Bermasalah',
  refunded: 'Dikembalikan',
  cancelled: 'Dibatalkan',
  expired: 'Kedaluwarsa',
};

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge variant={VARIANT_BY_STATUS[status]}>{LABEL_BY_STATUS[status]}</Badge>
);
