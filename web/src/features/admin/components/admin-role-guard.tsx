'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';

// Client-side only, cookie-presence-level check like proxy.ts — the API's
// @Roles('admin') on every /admin/* endpoint is the real authority, this
// just avoids a flash of admin UI for a non-admin before the API 403s.
export const AdminRoleGuard = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { data: user, isPending } = useCurrentUser();

  useEffect(() => {
    if (!isPending && user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [isPending, user, router]);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') return null;

  return <>{children}</>;
};
