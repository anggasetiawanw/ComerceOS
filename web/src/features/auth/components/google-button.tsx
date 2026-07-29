'use client';

import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const GoogleButton = () => {
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => {
        window.location.href = `${API_BASE_URL}/auth/google`;
      }}
    >
      Masuk dengan Google
    </Button>
  );
};
