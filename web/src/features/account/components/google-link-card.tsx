'use client';

import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/features/auth/api/auth.api';
import { authKeys } from '@/features/auth/api/auth.keys';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useGoogleIdToken } from '../hooks/use-google-id-token';

export const GoogleLinkCard = () => {
  const queryClient = useQueryClient();
  const { data: user, isPending: userPending } = useCurrentUser();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleToken = async (idToken: string) => {
    setError(null);
    setBusy(true);
    try {
      await authApi.linkGoogle(idToken);
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
    } catch (linkError) {
      setError(linkError instanceof ApiError ? linkError.problem.detail : 'Gagal menghubungkan Google.');
    } finally {
      setBusy(false);
    }
  };

  const { loadError, configured } = useGoogleIdToken(buttonRef, handleToken);

  const handleUnlink = async () => {
    setError(null);
    setBusy(true);
    try {
      await authApi.unlinkGoogle();
      await queryClient.invalidateQueries({ queryKey: authKeys.me() });
    } catch (unlinkError) {
      setError(unlinkError instanceof ApiError ? unlinkError.problem.detail : 'Gagal memutuskan Google.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Akun terhubung</CardTitle>
        <CardDescription>Hubungkan Google untuk masuk lebih cepat.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {userPending ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <span className="text-sm">Google</span>
              {user?.googleLinked ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || !user.hasPassword}
                  title={!user.hasPassword ? 'Atur kata sandi dulu sebelum memutuskan Google' : undefined}
                  onClick={handleUnlink}
                >
                  Putuskan
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">Belum terhubung</span>
              )}
            </div>
            {!user?.googleLinked && configured && <div ref={buttonRef} />}
            {!user?.googleLinked && !configured && (
              <p className="text-sm text-muted-foreground">
                Menghubungkan Google belum dikonfigurasi di lingkungan ini.
              </p>
            )}
          </>
        )}
        {loadError && (
          <p className="text-sm text-destructive">Gagal memuat tombol Google, coba muat ulang halaman.</p>
        )}
      </CardContent>
    </Card>
  );
};
