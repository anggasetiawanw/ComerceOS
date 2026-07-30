'use client';

import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';

interface CopyableTextProps {
  value: string;
  displayValue?: string;
}

export const CopyableText = ({ value, displayValue }: CopyableTextProps) => {
  const { copied, copy } = useClipboard();

  return (
    <div className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5">
      <span className="truncate text-sm">{displayValue ?? value}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Salin"
        onClick={() => copy(value)}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </Button>
    </div>
  );
};
