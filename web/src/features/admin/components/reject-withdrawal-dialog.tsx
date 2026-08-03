'use client';

import { useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/client';

interface RejectWithdrawalDialogProps {
  trigger: ReactElement;
  onConfirm: (reason?: string) => Promise<unknown>;
}

export const RejectWithdrawalDialog = ({ trigger, onConfirm }: RejectWithdrawalDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setPending(true);
    try {
      await onConfirm(reason.trim() || undefined);
      setOpen(false);
      setReason('');
    } catch (confirmError) {
      setError(confirmError instanceof ApiError ? confirmError.problem.detail : 'Terjadi kesalahan, coba lagi.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tolak penarikan</DialogTitle>
          <DialogDescription>Saldo penjual tidak akan berkurang. Alasan bersifat opsional.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Textarea
          placeholder="Alasan penolakan (opsional)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <DialogFooter>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => void handleConfirm()}>
            Tolak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
