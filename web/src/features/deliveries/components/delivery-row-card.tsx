'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { useDownloadDelivery } from '../hooks/use-download-delivery';
import type { BuyerDelivery } from '../types/delivery.types';

export const DeliveryRowCard = ({ delivery }: { delivery: BuyerDelivery }) => {
  const download = useDownloadDelivery();
  const [error, setError] = useState<string | null>(null);
  const limitReached = delivery.downloadCount >= delivery.maxDownloads;

  const handleDownload = async () => {
    setError(null);
    try {
      const result = await download.mutateAsync(delivery.id);
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof ApiError ? err.problem.detail : 'Gagal mengunduh file.');
    }
  };

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <p className="font-medium">{delivery.productName}</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {delivery.fileName && <span>{delivery.fileName}</span>}
              <span>{delivery.storeName}</span>
              <span>
                {delivery.downloadCount}/{delivery.maxDownloads} unduhan
              </span>
            </div>
          </div>
          <Button size="sm" disabled={download.isPending || limitReached} onClick={handleDownload}>
            {download.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
            {limitReached ? 'Batas tercapai' : 'Unduh'}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
};
