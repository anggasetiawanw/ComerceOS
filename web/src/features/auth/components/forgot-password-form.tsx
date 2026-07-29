'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/forms/form-field';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas/auth.schemas';
import { authApi } from '../api/auth.api';

export const ForgotPasswordForm = () => {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (values: ForgotPasswordInput) => {
    await authApi.forgotPassword(values);
    setSent(true);
  };

  if (sent) {
    return (
      <Alert>
        <AlertDescription>
          Jika email tersebut terdaftar, tautan atur ulang kata sandi telah dikirim.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4">
      <FormField label="Email" htmlFor="email" error={errors.email}>
        <Input id="email" type="email" autoComplete="email" {...register('email')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        Kirim tautan atur ulang
      </Button>
    </form>
  );
};
