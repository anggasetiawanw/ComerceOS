'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/akun', label: 'Pesanan' },
  { href: '/akun/unduhan', label: 'Unduhan' },
  { href: '/akun/profil', label: 'Profil' },
];

const AkunLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="flex flex-1 flex-col">
      <nav className="mx-auto flex w-full max-w-2xl gap-1 overflow-x-auto border-b px-4 pt-4">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || (tab.href === '/akun' && pathname.startsWith('/akun/pesanan/'));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'shrink-0 border-b-2 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                isActive ? 'border-foreground text-foreground' : 'border-transparent',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
};

export default AkunLayout;
