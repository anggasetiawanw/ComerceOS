const ProductPage = async ({ params }: { params: Promise<{ username: string; slug: string }> }) => {
  const { username, slug } = await params;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold">{slug}</h1>
      <p className="text-muted-foreground">Produk dari @{username} belum tersedia.</p>
    </div>
  );
};

export default ProductPage;
