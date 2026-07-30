'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/client';
import { UsernameInput } from './username-input';
import { useChangeUsername } from '../hooks/use-change-username';
import { changeUsernameSchema, type ChangeUsernameInput } from '../schemas/store.schemas';

export const UsernameChangeDialog = ({ currentUsername }: { currentUsername: string }) => {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const changeUsername = useChangeUsername();
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<ChangeUsernameInput>({
    resolver: zodResolver(changeUsernameSchema),
    defaultValues: { username: currentUsername },
  });

  const username = watch('username');

  const onSubmit = async (values: ChangeUsernameInput) => {
    setFormError(null);
    try {
      await changeUsername.mutateAsync(values.username);
      setOpen(false);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>Ganti username</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ganti username</DialogTitle>
          <DialogDescription>
            Link lama (@{currentUsername}) tidak akan bisa dipakai lagi selama beberapa waktu setelah
            diganti. Pastikan kamu sudah memperbarui link yang sudah dibagikan.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <UsernameInput value={username} onChange={(value) => setValue('username', value)} />
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting || username === currentUsername || username.length === 0}
            >
              Simpan username baru
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
