'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/forms/form-field';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/data/error-state';
import { ApiError } from '@/lib/api/client';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useUpdateProfile } from '@/features/auth/hooks/use-update-profile';
import { updateProfileSchema, type UpdateProfileInput } from '@/features/auth/schemas/auth.schemas';

const BuyerProfileFormInner = ({ name, phone }: { name: string; phone: string | null }) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const updateProfile = useUpdateProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name, phone: phone ?? '' },
  });

  const onSubmit = async (values: UpdateProfileInput) => {
    setFormError(null);
    setSaved(false);
    try {
      await updateProfile.mutateAsync({ name: values.name, phone: values.phone || undefined });
      setSaved(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.problem.detail : 'Terjadi kesalahan, coba lagi.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert>
          <AlertDescription>Profil tersimpan.</AlertDescription>
        </Alert>
      )}
      <FormField label="Nama" htmlFor="name" error={errors.name}>
        <Input id="name" {...register('name')} />
      </FormField>
      <FormField label="Nomor telepon" htmlFor="phone" error={errors.phone}>
        <Input id="phone" {...register('phone')} placeholder="08123456789" />
      </FormField>
      <Button type="submit" disabled={isSubmitting} className="self-start">
        Simpan
      </Button>
    </form>
  );
};

export const BuyerProfileForm = () => {
  const { data: user, isPending, isError, refetch } = useCurrentUser();

  if (isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  if (isError || !user) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return <BuyerProfileFormInner name={user.name} phone={user.phone} />;
};
