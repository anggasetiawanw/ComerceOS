'use client';

import Link from 'next/link';
import { formatWibDate } from '@nagihin/contracts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/feedback/confirm-dialog';
import { useMarkInquiryLost } from '../hooks/use-mark-inquiry-lost';
import type { Inquiry } from '../types/inquiry.types';

const STATUS_LABEL: Record<Inquiry['status'], string> = {
  open: 'Terbuka',
  converted: 'Sudah jadi pesanan',
  lost: 'Hilang',
};

export const InquiryRowCard = ({ inquiry }: { inquiry: Inquiry }) => {
  const markLost = useMarkInquiryLost();

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">{inquiry.productName ?? 'Pertanyaan umum'}</span>
          <Badge variant={inquiry.status === 'open' ? 'default' : 'outline'}>{STATUS_LABEL[inquiry.status]}</Badge>
        </div>
        <div className="flex flex-col text-xs text-muted-foreground">
          {inquiry.buyerName && <span>{inquiry.buyerName}</span>}
          <span>{formatWibDate(inquiry.createdAt)}</span>
        </div>
        {inquiry.status === 'open' && (
          <div className="flex gap-2">
            <Button size="sm" render={<Link href={`/dashboard/pesanan/manual?inquiryId=${inquiry.id}`} />}>
              Buat pesanan
            </Button>
            <ConfirmDialog
              trigger={
                <Button type="button" size="sm" variant="outline">
                  Tandai hilang
                </Button>
              }
              title="Tandai pertanyaan ini hilang?"
              description="Gunakan ini kalau pembeli tidak jadi order. Pertanyaan tidak akan hilang dari riwayat, hanya ditandai."
              confirmLabel="Tandai hilang"
              onConfirm={async () => {
                await markLost.mutateAsync(inquiry.id);
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
