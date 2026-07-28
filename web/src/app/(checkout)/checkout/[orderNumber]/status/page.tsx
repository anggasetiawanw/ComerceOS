const CheckoutStatusPage = async ({ params }: { params: Promise<{ orderNumber: string }> }) => {
  const { orderNumber } = await params;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold">Status pesanan {orderNumber}</h1>
      <p className="text-muted-foreground">Belum tersedia.</p>
    </div>
  );
};

export default CheckoutStatusPage;
