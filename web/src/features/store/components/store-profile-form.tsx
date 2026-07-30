'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/forms/form-field';
import { ApiError } from '@/lib/api/client';
import { useUpdateStoreProfile } from '../hooks/use-update-store-profile';
import { storeProfileSchema, type StoreProfileInput } from '../schemas/store.schemas';
import type { Store } from '../types/store.types';

export const StoreProfileForm = ({ store }: { store: Store }) => {
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const updateProfile = useUpdateStoreProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StoreProfileInput>({
    resolver: zodResolver(storeProfileSchema),
    defaultValues: { displayName: store.displayName, bio: store.bio ?? '' },
  });

  const onSubmit = async (values: StoreProfileInput) => {
    setFormError(null);
    setSaved(false);
    try {
      await updateProfile.mutateAsync({ displayName: values.displayName, bio: values.bio || null });
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
          <AlertDescription>Profil toko tersimpan.</AlertDescription>
        </Alert>
      )}
      <FormField label="Nama toko" htmlFor="displayName" error={errors.displayName}>
        <Input id="displayName" {...register('displayName')} />
      </FormField>
      <FormField label="Bio" htmlFor="bio" error={errors.bio}>
        <Textarea id="bio" rows={4} {...register('bio')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting} className="self-start">
        Simpan
      </Button>
    </form>
  );
};
