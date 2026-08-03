import { MoneyDisplay } from '@/components/data/money-display';
import { OrderStatusBadge } from '@/components/data/order-status-badge';
import type { Order } from '@/features/orders/types/order.types';

export const OrderSummary = ({ order }: { order: Order }) => (
  <div className="flex flex-col gap-4 rounded-lg border p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-muted-foreground">Nomor pesanan</p>
        <p className="font-mono text-sm font-medium">{order.orderNumber}</p>
      </div>
      <OrderStatusBadge status={order.status} />
    </div>

    <div className="flex flex-col gap-2">
      {order.items.map((item) => (
        <div key={item.id} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {item.productName} × {item.qty}
          </span>
          <MoneyDisplay value={item.price} />
        </div>
      ))}
    </div>

    <div className="flex items-center justify-between border-t pt-3 text-base font-semibold">
      <span>Total</span>
      <MoneyDisplay value={order.total} />
    </div>
  </div>
);
