import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const MarketingLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          Nagihin
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
};

export default MarketingLayout;
