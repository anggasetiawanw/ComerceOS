import { Gavel, LayoutDashboard, RefreshCw, ScrollText, Store, Users, Wallet, type LucideIcon } from 'lucide-react';

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'overview', label: 'Ringkasan', href: '/admin', icon: LayoutDashboard },
  { id: 'withdrawals', label: 'Penarikan', href: '/admin/penarikan', icon: Wallet },
  { id: 'disputes', label: 'Sengketa', href: '/admin/sengketa', icon: Gavel, disabled: true },
  { id: 'reconciliation', label: 'Rekonsiliasi', href: '/admin/rekonsiliasi', icon: RefreshCw, disabled: true },
  { id: 'stores', label: 'Toko', href: '/admin/toko', icon: Store, disabled: true },
  { id: 'users', label: 'Pengguna', href: '/admin/pengguna', icon: Users, disabled: true },
  { id: 'audit', label: 'Audit', href: '/admin/audit', icon: ScrollText, disabled: true },
];
