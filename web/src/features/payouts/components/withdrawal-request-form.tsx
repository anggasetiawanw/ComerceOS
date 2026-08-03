'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MoneyInput } from '@/components/forms/money-input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/client';
import { formatRupiah } from '@/lib/money';
import { useBalance } from '@/features/finance/hooks/use-balance';
import { useBankAccounts } from '../hooks/use-bank-accounts';
import { useRequestWithdrawal } from '../hooks/use-withdrawals';
import { WITHDRAWAL_MIN_AMOUNT_HINT } from '../schemas/payouts.schemas';

export const WithdrawalRequestForm = () => {
  const [amount, setAmount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { data: balance } = useBalance();
  const { data: bankAccounts } = useBankAccounts();
  const requestWithdrawal = useRequestWithdrawal();

  const hasDefaultAccount = bankAccounts?.some((account) => account.isDefault) ?? false;
  const amountNumber = Number(amount);
  const isValidAmount = amount.length > 0 && Number.isInteger(amountNumber) && amountNumber >= WITHDRAWAL_MIN_AMOUNT_HINT;

  const onSubmit = async () => {
    setFormError(null);
    setSuccess(false);
    try {
      await requestWithdrawal.mutateAsync(amountNumber);
      setAmount('');
      setSuccess(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {!hasDefaultAccount && (
        <Alert>
          <AlertDescription>Tambahkan rekening bank utama terlebih dahulu di bawah.</AlertDescription>
        </Alert>
      )}
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>Penarikan berhasil diajukan. Menunggu persetujuan admin.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="withdrawal-amount">Jumlah penarikan</Label>
        <MoneyInput id="withdrawal-amount" value={amount} onChange={setAmount} placeholder="0" />
        <p className="text-xs text-muted-foreground">
          Minimal {formatRupiah(String(WITHDRAWAL_MIN_AMOUNT_HINT))}
          {balance && <> — saldo yang bisa ditarik saat ini {formatRupiah(balance.withdrawable)}</>}
        </p>
      </div>

      <Button
        type="button"
        disabled={!isValidAmount || !hasDefaultAccount || requestWithdrawal.isPending}
        onClick={() => void onSubmit()}
        className="self-start"
      >
        Ajukan penarikan
      </Button>
    </div>
  );
};
