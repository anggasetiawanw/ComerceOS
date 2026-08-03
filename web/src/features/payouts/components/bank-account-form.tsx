'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { BANK_CODES } from '@nagihin/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/client';
import { useAddBankAccount } from '../hooks/use-bank-accounts';
import { bankAccountSchema, type BankAccountInput } from '../schemas/payouts.schemas';

export const BankAccountForm = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const addBankAccount = useAddBankAccount();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountInput>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: { bankCode: '', accountNumber: '', accountHolderName: '' },
  });

  const bankCode = watch('bankCode');

  const onSubmit = async (values: BankAccountInput) => {
    setFormError(null);
    try {
      await addBankAccount.mutateAsync(values);
      reset({ bankCode: '', accountNumber: '', accountHolderName: '' });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bankCode">Bank</Label>
          <Select value={bankCode} onValueChange={(value) => setValue('bankCode', value ?? '')}>
            <SelectTrigger id="bankCode" className="w-full">
              <SelectValue placeholder="Pilih bank" />
            </SelectTrigger>
            <SelectContent>
              {BANK_CODES.map((bank) => (
                <SelectItem key={bank.code} value={bank.code}>
                  {bank.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.bankCode && <p className="text-sm text-destructive">{errors.bankCode.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accountNumber">Nomor rekening</Label>
          <Input id="accountNumber" inputMode="numeric" {...register('accountNumber')} />
          {errors.accountNumber && <p className="text-sm text-destructive">{errors.accountNumber.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="accountHolderName">Nama pemilik rekening</Label>
          <Input id="accountHolderName" {...register('accountHolderName')} />
          {errors.accountHolderName && (
            <p className="text-sm text-destructive">{errors.accountHolderName.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={isSubmitting} className="self-start">
        Tambah rekening
      </Button>
    </form>
  );
};
