'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Script from 'next/script';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/data/error-state';
import { ApiError } from '@/lib/api/client';
import { useOrderStatus } from '@/features/checkout/hooks/use-order-status';
import { checkoutApi } from '@/features/checkout/api/checkout.api';
import { STUB_TOKEN_PREFIX } from '@/features/checkout/types/checkout.types';
import { OrderSummary } from '@/features/checkout/components/order-summary';

const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? '';
const MIDTRANS_IS_PRODUCTION = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === 'true';
const SNAP_SRC = MIDTRANS_IS_PRODUCTION
  ? 'https://app.midtrans.com/snap/snap.js'
  : 'https://app.sandbox.midtrans.com/snap/snap.js';

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const CheckoutPage = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const router = useRouter();
  const { data: order, isLoading, isError, refetch } = useOrderStatus(orderNumber);

  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [snapScriptReady, setSnapScriptReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!order || order.status !== 'pending_payment' || snapToken) return;
    checkoutApi
      .reissueSnapToken(order.id)
      .then((result) => setSnapToken(result.token))
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.problem.detail : 'Gagal memuat pembayaran.');
      });
  }, [order, snapToken]);

  useEffect(() => {
    if (order && order.status !== 'pending_payment') {
      router.replace(`/checkout/${orderNumber}/status`);
    }
  }, [order, orderNumber, router]);

  const isStubToken = snapToken?.startsWith(STUB_TOKEN_PREFIX) ?? false;

  const handlePay = () => {
    if (!snapToken || isStubToken) return;
    if (!window.snap) {
      setError('Pembayaran belum siap, coba lagi sebentar.');
      return;
    }
    window.snap.pay(snapToken, {
      onSuccess: () => router.push(`/checkout/${orderNumber}/status`),
      onPending: () => router.push(`/checkout/${orderNumber}/status`),
      onError: () => setError('Pembayaran gagal, coba lagi.'),
      onClose: () => {},
    });
  };

  const handleSimulate = async () => {
    setBusy(true);
    setError(null);
    try {
      await checkoutApi.simulatePayment(orderNumber);
      router.push(`/checkout/${orderNumber}/status`);
    } catch (err) {
      setError(err instanceof ApiError ? err.problem.detail : 'Terjadi kesalahan, coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-4 py-10">
      <h1 className="text-xl font-semibold">Checkout</h1>

      {MIDTRANS_CLIENT_KEY && !isStubToken && (
        <Script
          src={SNAP_SRC}
          data-client-key={MIDTRANS_CLIENT_KEY}
          strategy="afterInteractive"
          onLoad={() => setSnapScriptReady(true)}
        />
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && <ErrorState message="Pesanan tidak ditemukan." onRetry={() => void refetch()} />}

      {order && (
        <>
          <OrderSummary order={order} />

          {error && <p className="text-center text-sm text-destructive">{error}</p>}

          {order.status === 'pending_payment' && (
            <>
              {isStubToken ? (
                <Button onClick={handleSimulate} disabled={busy} className="w-full">
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Simulasikan pembayaran (dev)
                </Button>
              ) : (
                <Button
                  onClick={handlePay}
                  disabled={!snapToken || (!!MIDTRANS_CLIENT_KEY && !snapScriptReady)}
                  className="w-full"
                >
                  {!snapToken ? <Loader2 className="size-4 animate-spin" /> : null}
                  Bayar sekarang
                </Button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CheckoutPage;
