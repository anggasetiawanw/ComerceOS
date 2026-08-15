import Link from 'next/link';
import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MoneyDisplay } from '@/components/data/money-display';
import { OrderStatusBadge } from '@/components/data/order-status-badge';
import type { StoreOrderListItem } from '../types/store-order.types';

export const StoreOrderRowCard = ({ order }: { order: StoreOrderListItem }) => (
  <Link href={`/dashboard/pesanan/${order.id}`}>
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{order.orderNumber}</span>
          <MoneyDisplay value={order.total} className="font-medium" />
        </div>
        <div className="flex flex-col text-xs text-muted-foreground">
          <span>{order.buyerName}</span>
          <span>{order.buyerEmail}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <Badge variant="outline">{order.source === 'manual' ? 'Manual' : 'Checkout'}</Badge>
          </div>
          <span className="text-xs text-muted-foreground">{formatWibDate(order.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  </Link>
);
