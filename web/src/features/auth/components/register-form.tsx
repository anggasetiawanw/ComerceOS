'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/forms/form-field';
import { ApiError } from '@/lib/api/client';
import { registerSchema, type RegisterInput } from '../schemas/auth.schemas';
import { authApi } from '../api/auth.api';
import { GoogleButton } from './google-button';

export const RegisterForm = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null);
    try {
      await authApi.register(values);
      setDone(true);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.',
      );
    }
  };

  if (done) {
    return (
      <Alert>
        <AlertDescription>
          Akun berhasil dibuat. Silakan cek email Anda untuk memverifikasi akun sebelum masuk.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField label="Nama" htmlFor="name" error={errors.name}>
          <Input id="name" autoComplete="name" {...register('name')} />
        </FormField>
        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>
        <FormField label="Kata sandi" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
        </FormField>
        <Button type="submit" disabled={isSubmitting}>
          Daftar
        </Button>
      </form>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        atau
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground">
        Sudah punya akun?{' '}
        <Link href="/masuk" className="text-foreground hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
};
