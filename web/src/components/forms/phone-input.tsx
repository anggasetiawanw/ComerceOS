'use client';

import { Input } from '@/components/ui/input';

interface PhoneInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// No live 08xx <-> 62xx normalization on keystroke — the API's Phone value
// object normalizes on save, so this stays a plain masked-looking text
// input rather than duplicating that logic client-side.
export const PhoneInput = ({ id, value, onChange, placeholder }: PhoneInputProps) => (
  <Input
    id={id}
    inputMode="tel"
    placeholder={placeholder ?? '08123456789'}
    value={value}
    onChange={(event) => onChange(event.target.value)}
  />
);
