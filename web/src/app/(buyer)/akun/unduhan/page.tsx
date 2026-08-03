import { DeliveryList } from '@/features/deliveries/components/delivery-list';

const BuyerDownloadsPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-4 py-10">
      <h1 className="text-2xl font-semibold">Unduhan</h1>
      <DeliveryList />
    </div>
  );
};

export default BuyerDownloadsPage;
