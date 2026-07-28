const StorefrontPage = async ({ params }: { params: Promise<{ username: string }> }) => {
  const { username } = await params;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-16 text-center">
      <h1 className="text-2xl font-semibold">@{username}</h1>
      <p className="text-muted-foreground">Halaman toko belum tersedia.</p>
    </div>
  );
};

export default StorefrontPage;
