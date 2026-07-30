'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/client';
import { UsernameInput } from './username-input';
import { useCreateStore } from '../hooks/use-create-store';
import { createStoreSchema, type CreateStoreInput } from '../schemas/store.schemas';

export const CreateStoreCard = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const createStore = useCreateStore();
  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: { username: '' },
  });

  const username = watch('username');

  const onSubmit = async (values: CreateStoreInput) => {
    setFormError(null);
    try {
      await createStore.mutateAsync(values);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Buat toko kamu</CardTitle>
        <CardDescription>Klaim username untuk mendapatkan link storefront kamu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          <UsernameInput value={username} onChange={(value) => setValue('username', value)} />
          {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          <Button type="submit" disabled={isSubmitting || username.length === 0}>
            Buat toko
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
