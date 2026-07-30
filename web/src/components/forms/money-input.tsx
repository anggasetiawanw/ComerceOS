'use client';

import { Input } from '@/components/ui/input';
import { formatRupiah, parseRupiahInput } from '@/lib/money';

interface MoneyInputProps {
  id?: string;
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
}

export const MoneyInput = ({ id, value, onChange, placeholder }: MoneyInputProps) => (
  <div className="relative">
    <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-muted-foreground">
      Rp
    </span>
    <Input
      id={id}
      inputMode="numeric"
      className="pl-8"
      placeholder={placeholder}
      value={value ? formatRupiah(value).replace('Rp', '') : ''}
      onChange={(event) => onChange(parseRupiahInput(event.target.value))}
    />
  </div>
);
