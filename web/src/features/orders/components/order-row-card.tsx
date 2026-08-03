import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoneyDisplay } from '@/components/data/money-display';
import { OrderStatusBadge } from '@/components/data/order-status-badge';
import type { BuyerOrderListItem } from '../types/order.types';

export const OrderRowCard = ({ order }: { order: BuyerOrderListItem }) => (
  <Card>
    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="font-medium">{order.storeName}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{order.orderNumber}</span>
          <MoneyDisplay value={order.total} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>
      <Button variant="outline" size="sm" render={<Link href={`/akun/pesanan/${order.id}`} />}>
        Lihat detail
      </Button>
    </CardContent>
  </Card>
);
