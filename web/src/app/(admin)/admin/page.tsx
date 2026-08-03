import { MetricsCards } from '@/features/admin/components/metrics-cards';

const AdminOverviewPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Metrik platform: GMV, take rate, dan liabilitas seller.</p>
      </div>
      <MetricsCards />
    </div>
  );
};

export default AdminOverviewPage;
