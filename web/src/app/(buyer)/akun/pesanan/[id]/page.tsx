const BuyerOrderDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold">Pesanan {id}</h1>
      <p className="text-muted-foreground">Belum tersedia.</p>
    </div>
  );
};

export default BuyerOrderDetailPage;
