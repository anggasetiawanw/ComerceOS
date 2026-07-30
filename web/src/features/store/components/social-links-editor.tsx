'use client';

import { ArrowDown, ArrowUp, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/data/empty-state';
import { ErrorState } from '@/components/data/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useReorderSocialLinks,
  useRemoveSocialLink,
  useSocialLinks,
} from '../hooks/use-social-links';
import { SocialLinkForm } from './social-link-form';

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  whatsapp: 'WhatsApp',
  youtube: 'YouTube',
  other: 'Lainnya',
};

export const SocialLinksEditor = () => {
  const { data: links, isPending, isError, refetch } = useSocialLinks();
  const reorder = useReorderSocialLinks();
  const remove = useRemoveSocialLink();

  const move = (index: number, direction: -1 | 1) => {
    if (!links) return;
    const target = index + direction;
    if (target < 0 || target >= links.length) return;
    const orderedIds = links.map((link) => link.id);
    const temp = orderedIds[index];
    orderedIds[index] = orderedIds[target];
    orderedIds[target] = temp;
    reorder.mutate(orderedIds);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tautan sosial</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <SocialLinkForm />

        {isPending && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {isError && <ErrorState onRetry={() => refetch()} />}

        {links && links.length === 0 && (
          <EmptyState
            title="Belum ada tautan sosial"
            description="Tambahkan agar pembeli bisa menghubungi kamu."
          />
        )}

        {links && links.length > 0 && (
          <ul className="flex flex-col gap-2">
            {links.map((link, index) => (
              <li
                key={link.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2"
              >
                <span className="w-20 shrink-0 text-sm font-medium">
                  {PLATFORM_LABELS[link.platform] ?? link.platform}
                </span>
                <span className="flex-1 truncate text-sm text-muted-foreground">{link.url}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Naikkan"
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Turunkan"
                  disabled={index === links.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hapus"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(link.id)}
                >
                  {remove.isPending && remove.variables === link.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
