'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCreateCheckout } from '@/features/checkout/hooks/use-create-checkout';

interface BuyWhatsappButtonsProps {
  productId: string;
}

export const BuyWhatsappButtons = ({ productId }: BuyWhatsappButtonsProps) => {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const createCheckout = useCreateCheckout();
  const [error, setError] = useState<string | null>(null);

  const handleBeli = async () => {
    setError(null);

    if (!user) {
      router.push('/masuk');
      return;
    }

    try {
      const result = await createCheckout.mutateAsync([{ productId, qty: 1 }]);
      router.push(`/checkout/${result.order.orderNumber}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={handleBeli} disabled={createCheckout.isPending || isLoadingUser}>
          {createCheckout.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
          Beli
        </Button>
        <Button variant="outline" className="flex-1" disabled>
          <MessageCircle className="size-4" />
          Tanya dulu via WA
        </Button>
      </div>
      {error ? (
        <p className="text-center text-xs text-destructive">{error}</p>
      ) : (
        <p className="text-center text-xs text-muted-foreground">Pertanyaan via WA belum tersedia di versi ini.</p>
      )}
    </div>
  );
};
