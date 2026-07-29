'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthTokenStore } from '@/lib/auth/token-store';
import { authApi } from '@/features/auth/api/auth.api';

const CallbackHandler = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAccessToken = useAuthTokenStore((state) => state.setAccessToken);

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const error = searchParams.get('error');

    if (error) {
      router.replace(`/masuk?error=${error}`);
      return;
    }

    if (!accessToken) {
      router.replace('/masuk');
      return;
    }

    setAccessToken(accessToken);

    authApi
      .me()
      .then((user) => {
        router.replace(user.phone ? '/dashboard' : '/lengkapi-profil');
      })
      .catch(() => {
        router.replace('/masuk');
      });
  }, [searchParams, router, setAccessToken]);

  return (
    <div className="flex flex-col items-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold">Memproses masuk…</h1>
    </div>
  );
};

const OAuthCallbackPage = () => {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
};

export default OAuthCallbackPage;
