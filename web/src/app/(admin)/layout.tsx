import { AdminShell } from '@/components/layout/admin-shell';
import { AdminRoleGuard } from '@/features/admin/components/admin-role-guard';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <AdminRoleGuard>
      <AdminShell>{children}</AdminShell>
    </AdminRoleGuard>
  );
};

export default AdminLayout;
