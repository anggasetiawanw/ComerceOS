import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { MoneyDisplay } from '@/components/data/money-display';
import type { StoreBuyer } from '../types/buyer.types';

export const BuyerRowCard = ({ buyer }: { buyer: StoreBuyer }) => (
  <Card>
    <CardContent className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">{buyer.buyerName}</span>
          <span className="text-xs text-muted-foreground">{buyer.buyerEmail}</span>
        </div>
        <MoneyDisplay value={buyer.totalSpent} className="font-medium" />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{buyer.totalOrders} pesanan</span>
        <span>Terakhir {formatWibDate(buyer.lastPurchaseAt)}</span>
      </div>
    </CardContent>
  </Card>
);
