'use client';

import { Loader2, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useBankAccounts, useRemoveBankAccount, useSetDefaultBankAccount } from '../hooks/use-bank-accounts';
import { BankAccountForm } from './bank-account-form';

export const BankAccountList = () => {
  const { data: accounts, isPending, isError, refetch } = useBankAccounts();
  const setDefault = useSetDefaultBankAccount();
  const remove = useRemoveBankAccount();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rekening bank</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <BankAccountForm />

        {isPending && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}

        {isError && <ErrorState onRetry={() => void refetch()} />}

        {accounts && accounts.length === 0 && (
          <EmptyState
            title="Belum ada rekening"
            description="Tambahkan rekening bank sebelum bisa menarik saldo."
          />
        )}

        {accounts && accounts.length > 0 && (
          <ul className="flex flex-col gap-2">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-col gap-2 rounded-md border px-3 py-2 sm:flex-row sm:items-center"
              >
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {account.bankName} — {account.accountNumber}
                  </span>
                  <span className="text-xs text-muted-foreground">{account.accountHolderName}</span>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {account.isDefault && <Badge variant="outline">Utama</Badge>}
                  {!account.isDefault && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={setDefault.isPending}
                      onClick={() => setDefault.mutate(account.id)}
                    >
                      {setDefault.isPending && setDefault.variables === account.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Star className="size-3.5" />
                      )}
                      Jadikan utama
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="max-sm:min-h-11 max-sm:min-w-11"
                    aria-label="Hapus rekening"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(account.id)}
                  >
                    {remove.isPending && remove.variables === account.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
