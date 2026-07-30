import {
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Store,
  Users,
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
  { id: 'products', label: 'Produk', href: '/dashboard/produk', icon: Package, disabled: true },
  { id: 'orders', label: 'Pesanan', href: '/dashboard/pesanan', icon: Receipt, disabled: true },
  { id: 'buyers', label: 'Pembeli', href: '/dashboard/pembeli', icon: Users, disabled: true },
  { id: 'settings', label: 'Pengaturan', href: '/dashboard/pengaturan', icon: Settings },
];
