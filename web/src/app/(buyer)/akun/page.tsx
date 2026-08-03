import { OrderList } from '@/features/orders/components/order-list';

const BuyerAccountPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-10">
      <h1 className="text-2xl font-semibold">Riwayat pesanan</h1>
      <OrderList />
    </div>
  );
};

export default BuyerAccountPage;
