'use client';

import { useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { useUsernameAvailability } from '../hooks/use-username-availability';
import { usernameSchema } from '../schemas/store.schemas';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}

type UsernameStatus = 'idle' | 'invalid' | 'checking' | 'available' | 'unavailable';

const deriveStatus = (params: {
  touched: boolean;
  value: string;
  debounced: string;
  formatIsValid: boolean;
  isFetching: boolean;
  available?: boolean;
}): UsernameStatus => {
  const { touched, value, debounced, formatIsValid, isFetching, available } = params;
  if (!touched || value.length === 0) return 'idle';
  if (!formatIsValid) return 'invalid';
  if (debounced !== value || isFetching || available === undefined) return 'checking';
  return available ? 'available' : 'unavailable';
};

export const UsernameInput = ({ value, onChange, id = 'username' }: UsernameInputProps) => {
  const [touched, setTouched] = useState(false);
  const debounced = useDebounce(value, 400);
  const formatIsValid = usernameSchema.safeParse(debounced).success;
  const { data, isFetching } = useUsernameAvailability(debounced, touched && formatIsValid);

  const status = deriveStatus({
    touched,
    value,
    debounced,
    formatIsValid,
    isFetching,
    available: data?.available,
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">@</span>
        <Input
          id={id}
          value={value}
          onChange={(event) => {
            setTouched(true);
            onChange(event.target.value.toLowerCase());
          }}
          placeholder="tokosaya"
          autoComplete="off"
        />
        {status === 'checking' && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />}
        {status === 'available' && <Check className="size-4 shrink-0 text-primary" />}
        {(status === 'unavailable' || status === 'invalid') && (
          <X className="size-4 shrink-0 text-destructive" />
        )}
      </div>
      {status === 'available' && (
        <p className="text-sm text-primary">Tersedia — nagihin.id/@{debounced}</p>
      )}
      {status === 'unavailable' && (
        <p className="text-sm text-destructive">
          {data?.reason === 'reserved' ? 'Username ini tidak boleh dipakai' : 'Username ini sudah dipakai'}
        </p>
      )}
      {status === 'invalid' && (
        <p className="text-sm text-destructive">
          3-30 karakter, huruf kecil, angka, titik, dan garis bawah
        </p>
      )}
    </div>
  );
};
