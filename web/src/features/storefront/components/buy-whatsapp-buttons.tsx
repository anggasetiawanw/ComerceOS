import { MessageCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const BuyWhatsappButtons = () => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button className="flex-1" disabled>
        <ShoppingCart className="size-4" />
        Beli
      </Button>
      <Button variant="outline" className="flex-1" disabled>
        <MessageCircle className="size-4" />
        Tanya dulu via WA
      </Button>
    </div>
    <p className="text-center text-xs text-muted-foreground">Pembelian belum tersedia di versi ini.</p>
  </div>
);
