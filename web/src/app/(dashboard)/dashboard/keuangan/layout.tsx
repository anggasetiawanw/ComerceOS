'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/keuangan', label: 'Ringkasan' },
  { href: '/dashboard/keuangan/penarikan', label: 'Penarikan' },
  { href: '/dashboard/keuangan/rekening', label: 'Rekening' },
];

const KeuanganLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Keuangan</h1>
        <p className="text-sm text-muted-foreground">Saldo, penarikan, dan rekening bank toko kamu.</p>
      </div>
      <nav className="flex gap-1 border-b">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'border-b-2 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
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

export default KeuanganLayout;
