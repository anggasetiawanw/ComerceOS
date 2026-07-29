'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/forms/form-field';
import { ApiError } from '@/lib/api/client';
import { resetPasswordSchema, type ResetPasswordInput } from '../schemas/auth.schemas';
import { authApi } from '../api/auth.api';

export const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Tautan tidak valid atau sudah kedaluwarsa.</AlertDescription>
      </Alert>
    );
  }

  const onSubmit = async (values: ResetPasswordInput) => {
    setFormError(null);
    try {
      await authApi.resetPassword({ token, password: values.password });
      router.push('/masuk?reset=1');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.',
      );
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <FormField label="Kata sandi baru" htmlFor="password" error={errors.password}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register('password')}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        Atur ulang kata sandi
      </Button>
    </form>
  );
};
