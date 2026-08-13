import Link from 'next/link';
import { Button } from '@/components/ui/button';

const PanduanPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Panduan memulai</h1>
        <p className="text-sm text-muted-foreground">
          Enam langkah dari daftar akun sampai dana pertama cair ke rekeningmu.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">1. Daftar dan buat toko</h2>
        <p className="text-sm text-muted-foreground">
          Daftar dengan akun Google atau email dan kata sandi, verifikasi email kamu, lalu buat toko. Satu
          akun hanya bisa memiliki satu toko.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">2. Klaim link @username</h2>
        <p className="text-sm text-muted-foreground">
          Username menjadi link publik tokomu, misalnya <span className="font-mono">nagihin.id/@tokokamu</span>.
          Lengkapi juga nama toko, bio, foto profil, dan banner agar halaman publikmu siap dibagikan.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">3. Tambahkan produk pertama</h2>
        <p className="text-sm text-muted-foreground">
          Produk digital (file, e-book, template) langsung terkirim ke pembeli lewat tautan unduhan setelah
          pembayaran berhasil. Produk fisik atau jasa kamu kelola dan kirim sendiri di luar platform. Produk
          harus dipublikasikan sebelum tampil di halaman tokomu.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">4. Cara pembeli membayar</h2>
        <p className="text-sm text-muted-foreground">
          Pembeli checkout dan membayar lewat Midtrans — kartu, transfer bank, e-wallet, dan metode lain yang
          didukung. Kami tidak pernah menyimpan data kartu pembeli. Status pesanan diperbarui otomatis begitu
          pembayaran diterima.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">5. Masa tahan dana dan pencairan</h2>
        <p className="text-sm text-muted-foreground">
          Dana dari transaksi yang berhasil ditahan sebentar sebelum masuk ke saldo yang bisa ditarik —
          biasanya T+3 hari kerja setelah settlement dari Midtrans. Produk digital dicairkan begitu settlement
          selesai, produk fisik menunggu tambahan waktu setelah pesanan dikirim, dan jasa menunggu paling
          lama karena risikonya paling tinggi. Kamu bisa melihat kapan setiap pesanan cair di halaman
          Keuangan.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">6. Rekening bank dan penarikan</h2>
        <p className="text-sm text-muted-foreground">
          Tambahkan rekening bank di halaman Keuangan sebelum bisa menarik saldo. Biaya platform adalah 5%
          dari setiap transaksi untuk paket gratis, atau 2.5% untuk paket Pro. Setelah saldo tersedia, ajukan
          penarikan dan tim kami akan memprosesnya secara manual.
        </p>
      </section>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button render={<Link href="/daftar" />}>Daftar sekarang</Button>
        <Button variant="outline" render={<Link href="/masuk" />}>
          Sudah punya akun
        </Button>
      </div>
    </div>
  );
};

export default PanduanPage;
