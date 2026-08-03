'use client';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { StoreBuyerSort } from '../types/buyer.types';

const SORT_OPTIONS: { value: StoreBuyerSort; label: string }[] = [
  { value: 'recent', label: 'Pembelian terbaru' },
  { value: 'total_spent', label: 'Total belanja' },
  { value: 'total_orders', label: 'Jumlah pesanan' },
];

const isStoreBuyerSort = (value: unknown): value is StoreBuyerSort =>
  typeof value === 'string' && SORT_OPTIONS.some((option) => option.value === value);

interface BuyerSearchProps {
  search: string;
  onSearchChange: (value: string) => void;
  sort: StoreBuyerSort;
  onSortChange: (value: StoreBuyerSort) => void;
}

export const BuyerSearch = ({ search, onSearchChange, sort, onSortChange }: BuyerSearchProps) => (
  <div className="flex flex-col gap-2 sm:flex-row">
    <Input
      placeholder="Cari nama atau email pembeli..."
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
      className="sm:max-w-xs"
    />
    <Select
      value={sort}
      onValueChange={(value) => {
        if (isStoreBuyerSort(value)) onSortChange(value);
      }}
    >
      <SelectTrigger className="w-full sm:w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);
