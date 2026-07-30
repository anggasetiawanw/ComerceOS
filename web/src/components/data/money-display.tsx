import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';

interface MoneyDisplayProps {
  value: string;
  className?: string;
}

export const MoneyDisplay = ({ value, className }: MoneyDisplayProps) => (
  <span className={cn('tabular-nums', className)}>{formatRupiah(value)}</span>
);
