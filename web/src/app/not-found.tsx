import Link from 'next/link';

const NotFound = () => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-16 text-center">
      <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground">
        Halaman yang kamu cari tidak ada atau sudah dipindahkan.
      </p>
      <Link href="/" className="underline">
        Kembali ke beranda
      </Link>
    </div>
  );
};

export default NotFound;
