'use client';

import { Button } from '@/components/ui/button';

const StorefrontError = ({ reset }: { error: Error; reset: () => void }) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 p-16 text-center">
    <h1 className="text-2xl font-semibold">Terjadi kesalahan</h1>
    <p className="text-muted-foreground">Gagal memuat halaman toko ini.</p>
    <Button onClick={reset}>Coba lagi</Button>
  </div>
);

export default StorefrontError;
