'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRupiah } from '@/lib/money';
import { useProducts } from '@/features/products/hooks/use-products';

interface ProductSelectProps {
  value: string;
  onChange: (productId: string) => void;
  placeholder?: string;
}

// A plain searchless dropdown over active products — a full search-as-you-
// type combobox was cut for this sprint; a seller's active catalog is
// small enough at pilot scale that a dropdown is not yet a usability
// problem (.docs/11-frontend.md names ProductSelect for manual orders and
// promo scope).
export const ProductSelect = ({ value, onChange, placeholder = 'Pilih produk' }: ProductSelectProps) => {
  const { data, isPending } = useProducts({ status: 'active', limit: 100 });

  return (
    <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={isPending ? 'Memuat produk...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {data?.items.map((product) => (
          <SelectItem key={product.id} value={product.id}>
            {product.name} — {formatRupiah(product.price)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
