'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { OrderStatus } from '@/features/orders/types/order.types';
import type { OrderSource } from '../types/store-order.types';

const STATUS_OPTIONS: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'pending_payment', label: 'Menunggu pembayaran' },
  { value: 'paid', label: 'Dibayar' },
  { value: 'holding', label: 'Dana ditahan' },
  { value: 'released', label: 'Selesai' },
  { value: 'disputed', label: 'Bermasalah' },
  { value: 'refunded', label: 'Dikembalikan' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'expired', label: 'Kedaluwarsa' },
];

const SOURCE_OPTIONS: { value: OrderSource | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua sumber' },
  { value: 'self_checkout', label: 'Checkout' },
  { value: 'manual', label: 'Manual' },
];

interface StoreOrderFiltersProps {
  status: OrderStatus | 'all';
  onStatusChange: (value: OrderStatus | 'all') => void;
  source: OrderSource | 'all';
  onSourceChange: (value: OrderSource | 'all') => void;
  buyerSearch: string;
  onBuyerSearchChange: (value: string) => void;
}

export const StoreOrderFilters = ({
  status,
  onStatusChange,
  source,
  onSourceChange,
  buyerSearch,
  onBuyerSearchChange,
}: StoreOrderFiltersProps) => (
  <div className="flex flex-col gap-2 sm:flex-row">
    <Input
      placeholder="Cari nama atau email pembeli..."
      value={buyerSearch}
      onChange={(event) => onBuyerSearchChange(event.target.value)}
      className="sm:max-w-xs"
    />
    <Select value={status} onValueChange={(value) => onStatusChange(value as OrderStatus | 'all')}>
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
    <Select value={source} onValueChange={(value) => onSourceChange(value as OrderSource | 'all')}>
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SOURCE_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
