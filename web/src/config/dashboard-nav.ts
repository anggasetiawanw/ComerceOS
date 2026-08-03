import {
  FileText,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface DashboardNavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { id: 'overview', label: 'Ringkasan', href: '/dashboard', icon: LayoutDashboard, disabled: true },
  { id: 'store', label: 'Toko', href: '/dashboard/toko', icon: Store },
  { id: 'products', label: 'Produk', href: '/dashboard/produk', icon: Package },
  { id: 'orders', label: 'Pesanan', href: '/dashboard/pesanan', icon: Receipt, disabled: true },
  { id: 'finance', label: 'Keuangan', href: '/dashboard/keuangan', icon: Wallet },
  { id: 'invoices', label: 'Invoice', href: '/dashboard/invoice', icon: FileText },
  { id: 'buyers', label: 'Pembeli', href: '/dashboard/pembeli', icon: Users },
  { id: 'settings', label: 'Pengaturan', href: '/dashboard/pengaturan', icon: Settings },
];
