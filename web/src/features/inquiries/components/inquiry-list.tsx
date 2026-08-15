'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useInquiries } from '../hooks/use-inquiries';
import type { InquiryStatus } from '../types/inquiry.types';
import { InquiryRowCard } from './inquiry-row-card';

const STATUS_OPTIONS: { value: InquiryStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'open', label: 'Terbuka' },
  { value: 'converted', label: 'Sudah jadi pesanan' },
  { value: 'lost', label: 'Hilang' },
];

export const InquiryList = () => {
  const [status, setStatus] = useState<InquiryStatus | 'all'>('open');
  const { data, isPending, isError, refetch } = useInquiries({ status: status === 'all' ? undefined : status });

  return (
    <div className="flex flex-col gap-4">
      <Select value={status} onValueChange={(value) => setStatus(value as InquiryStatus | 'all')}>
        <SelectTrigger className="w-full sm:w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {isError && <ErrorState onRetry={() => void refetch()} />}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={MessageCircle}
          title="Belum ada pertanyaan"
          description="Pertanyaan dari tombol Tanya via WA di storefront kamu akan muncul di sini."
        />
      )}

      {data && data.items.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.items.map((inquiry) => (
            <InquiryRowCard key={inquiry.id} inquiry={inquiry} />
          ))}
        </div>
      )}
    </div>
  );
};
