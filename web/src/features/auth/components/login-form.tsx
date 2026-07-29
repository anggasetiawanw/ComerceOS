'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/forms/form-field';
import { useAuthTokenStore } from '@/lib/auth/token-store';
import { ApiError } from '@/lib/api/client';
import { loginSchema, type LoginInput } from '../schemas/auth.schemas';
import { authApi } from '../api/auth.api';
import { GoogleButton } from './google-button';

export const LoginForm = () => {
  const router = useRouter();
  const setAccessToken = useAuthTokenStore((state) => state.setAccessToken);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    setFormError(null);
    try {
      const result = await authApi.login(values);
      setAccessToken(result.accessToken);
      router.push(result.user.phone ? '/dashboard' : '/lengkapi-profil');
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.',
      );
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
        </FormField>
        <FormField label="Kata sandi" htmlFor="password" error={errors.password}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
        </FormField>
        <div className="flex justify-end">
          <Link href="/lupa-password" className="text-sm text-muted-foreground hover:underline">
            Lupa kata sandi?
          </Link>
        </div>
        <Button type="submit" disabled={isSubmitting}>
          Masuk
        </Button>
      </form>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        atau
        <div className="h-px flex-1 bg-border" />
      </div>
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground">
        Belum punya akun?{' '}
        <Link href="/daftar" className="text-foreground hover:underline">
          Daftar
        </Link>
      </p>
    </div>
  );
};
