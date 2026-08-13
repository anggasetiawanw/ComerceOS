'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { authApi } from '@/features/auth/api/auth.api';
import { useAuthTokenStore } from '@/lib/auth/token-store';
import { PlanBadge } from '@/features/store/components/plan-badge';

export const DashboardTopbar = () => {
  const router = useRouter();
  const setAccessToken = useAuthTokenStore((state) => state.setAccessToken);
  const { data: user } = useCurrentUser();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      router.push('/masuk');
    }
  };

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : '..';

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="flex flex-1 items-center gap-2">
        {user?.store && <PlanBadge plan={user.store.plan} />}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-2 outline-none hover:bg-muted">
          <Avatar className="size-7">
            <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? ''} />
            <AvatarFallback>
              {user?.name ? initials : <UserIcon className="size-4" />}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="truncate">{user?.name ?? 'Akun'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
