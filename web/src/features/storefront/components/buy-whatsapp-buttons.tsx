'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MessageCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useCreateCheckout } from '@/features/checkout/hooks/use-create-checkout';
import { inquiryApi } from '@/features/inquiries/api/inquiry.api';

interface BuyWhatsappButtonsProps {
  productId: string;
  username: string;
  hasWhatsapp: boolean;
}

export const BuyWhatsappButtons = ({ productId, username, hasWhatsapp }: BuyWhatsappButtonsProps) => {
  const router = useRouter();
  const { data: user, isLoading: isLoadingUser } = useCurrentUser();
  const createCheckout = useCreateCheckout();
  const [error, setError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

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

  const handleTanya = async () => {
    setError(null);
    setIsAsking(true);
    try {
      const result = await inquiryApi.create(username, productId);
      if (result.waLink) {
        window.open(result.waLink, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.problem.detail : 'Terjadi kesalahan, coba lagi.');
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" onClick={handleBeli} disabled={createCheckout.isPending || isLoadingUser}>
          {createCheckout.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}
          Beli
        </Button>
        {hasWhatsapp && (
          <Button variant="outline" className="flex-1" onClick={handleTanya} disabled={isAsking}>
            {isAsking ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
            Tanya dulu via WA
          </Button>
        )}
      </div>
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
    </div>
  );
};
