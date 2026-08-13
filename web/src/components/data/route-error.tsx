'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export const RouteError = ({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-2xl font-semibold">Terjadi kesalahan</h1>
      <p className="text-muted-foreground">Sesuatu tidak berjalan sebagaimana mestinya.</p>
      <Button onClick={reset}>Coba lagi</Button>
    </div>
  );
};
