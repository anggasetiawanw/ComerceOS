'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiError } from '@/lib/api/client';
import { useAddSocialLink } from '../hooks/use-social-links';
import { socialLinkSchema, type SocialLinkInput } from '../schemas/store.schemas';
import { SOCIAL_PLATFORMS } from '../types/store.types';

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  other: 'Lainnya',
};

export const SocialLinkForm = () => {
  const [formError, setFormError] = useState<string | null>(null);
  const addSocialLink = useAddSocialLink();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SocialLinkInput>({
    resolver: zodResolver(socialLinkSchema),
    defaultValues: { platform: 'instagram', url: '' },
  });

  const platform = watch('platform');

  const onSubmit = async (values: SocialLinkInput) => {
    setFormError(null);
    try {
      await addSocialLink.mutateAsync(values);
      reset({ platform: values.platform, url: '' });
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
      <div className="flex gap-2">
        <Select value={platform} onValueChange={(value) => setValue('platform', value as typeof platform)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SOCIAL_PLATFORMS.map((value) => (
              <SelectItem key={value} value={value}>
                {PLATFORM_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="https://..." {...register('url')} />
        <Button type="submit" disabled={isSubmitting}>
          Tambah
        </Button>
      </div>
      {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
    </form>
  );
};
