import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SyaratKetentuanPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Syarat &amp; Ketentuan</h1>

      <Alert variant="destructive">
        <AlertTitle>Draf sementara</AlertTitle>
        <AlertDescription>
          Dokumen ini adalah draf sementara untuk keperluan struktur halaman dan belum ditinjau oleh
          penasihat hukum. Jangan digunakan sebagai dasar hukum yang mengikat sebelum ditinjau dan disetujui
          oleh pengacara.
        </AlertDescription>
      </Alert>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">1. Tentang Layanan</h2>
        <p className="text-sm text-muted-foreground">
          Nagihin adalah platform yang menyediakan storefront, pemrosesan pembayaran, dan pencatatan
          transaksi bagi penjual perorangan dan usaha kecil di Indonesia.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">2. Akun Pengguna</h2>
        <p className="text-sm text-muted-foreground">
          Pengguna dapat mendaftar menggunakan akun Google atau email dan kata sandi. Email wajib diverifikasi
          sebelum akun dapat digunakan sepenuhnya. Pengguna bertanggung jawab menjaga kerahasiaan kredensial
          akunnya.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">3. Kewajiban Penjual</h2>
        <p className="text-sm text-muted-foreground">
          Penjual wajib memberikan informasi produk yang akurat, mengirimkan produk digital sesuai deskripsi,
          dan menanggapi pertanyaan atau sengketa pembeli dengan itikad baik.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">4. Proses Pembayaran &amp; Midtrans</h2>
        <p className="text-sm text-muted-foreground">
          Seluruh pembayaran diproses melalui Midtrans sebagai penyedia payment gateway. Nagihin tidak
          menyimpan data kartu pembayaran pembeli.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">5. Masa Tahan Dana &amp; Pencairan</h2>
        <p className="text-sm text-muted-foreground">
          Dana dari transaksi yang berhasil akan ditahan sementara (masa tahan) sebelum dapat dicairkan ke
          saldo yang tersedia, sesuai dengan jenis produk dan mode penyelesaian yang dipilih penjual. Penjual
          dapat mengajukan penarikan dana setelah masa tahan berakhir.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">6. Biaya Platform</h2>
        <p className="text-sm text-muted-foreground">
          Nagihin mengenakan biaya platform berupa persentase dari setiap transaksi yang berhasil, yang
          besarannya dapat berbeda tergantung paket langganan penjual.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">7. Produk Digital &amp; Pengiriman</h2>
        <p className="text-sm text-muted-foreground">
          Produk digital dikirimkan melalui tautan unduhan yang aman setelah pembayaran berhasil. Produk
          fisik dikelola langsung oleh penjual di luar platform.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">8. Pembatalan &amp; Refund</h2>
        <p className="text-sm text-muted-foreground">
          Pesanan yang tidak dibayar dalam batas waktu akan dibatalkan otomatis. Permintaan pengembalian dana
          ditangani sesuai kebijakan yang berlaku pada saat transaksi.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">9. Sengketa</h2>
        <p className="text-sm text-muted-foreground">
          Pembeli dan penjual dapat mengajukan sengketa atas suatu pesanan. Selama proses sengketa
          berlangsung, dana terkait akan dibekukan hingga penyelesaian tercapai.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">10. Penghentian Akun</h2>
        <p className="text-sm text-muted-foreground">
          Nagihin berhak menangguhkan atau menghentikan akun yang melanggar ketentuan ini, termasuk namun
          tidak terbatas pada aktivitas penipuan atau pelanggaran hukum.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">11. Perubahan Ketentuan</h2>
        <p className="text-sm text-muted-foreground">
          Ketentuan ini dapat diperbarui dari waktu ke waktu. Perubahan akan diberitahukan melalui platform
          atau email terdaftar.
        </p>
      </section>
    </div>
  );
};

export default SyaratKetentuanPage;
