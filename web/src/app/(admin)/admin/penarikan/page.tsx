import { WithdrawalQueueTable } from '@/features/admin/components/withdrawal-queue-table';

const AdminWithdrawalsPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Penarikan</h1>
        <p className="text-sm text-muted-foreground">Setujui, tolak, atau tandai lunas pengajuan penarikan seller.</p>
      </div>
      <WithdrawalQueueTable />
    </div>
  );
};

export default AdminWithdrawalsPage;
