import Link from 'next/link';

export const MarketingFooter = () => (
  <footer className="border-t px-6 py-4 text-sm text-muted-foreground">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span>© {new Date().getFullYear()} Nagihin</span>
      <div className="flex gap-4">
        <Link href="/panduan" className="hover:text-foreground">
          Panduan
        </Link>
        <Link href="/syarat-ketentuan" className="hover:text-foreground">
          Syarat &amp; Ketentuan
        </Link>
        <Link href="/kebijakan-privasi" className="hover:text-foreground">
          Kebijakan Privasi
        </Link>
      </div>
    </div>
  </footer>
);
