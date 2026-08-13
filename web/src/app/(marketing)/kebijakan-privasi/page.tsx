import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const KebijakanPrivasiPage = () => {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Kebijakan Privasi</h1>

      <Alert variant="destructive">
        <AlertTitle>Draf sementara</AlertTitle>
        <AlertDescription>
          Dokumen ini adalah draf sementara untuk keperluan struktur halaman dan belum ditinjau oleh
          penasihat hukum. Jangan digunakan sebagai dasar hukum yang mengikat sebelum ditinjau dan disetujui
          oleh pengacara.
        </AlertDescription>
      </Alert>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">1. Data yang Dikumpulkan</h2>
        <p className="text-sm text-muted-foreground">
          Kami mengumpulkan nama, alamat email, nomor telepon, data akun Google (bila digunakan untuk masuk),
          data transaksi, dan informasi rekening bank yang diperlukan untuk pencairan dana penjual.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">2. Penggunaan Data</h2>
        <p className="text-sm text-muted-foreground">
          Data digunakan untuk memproses transaksi, mengirimkan invoice dan notifikasi, mencegah penipuan,
          serta meningkatkan kualitas layanan.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">3. Berbagi Data dengan Pihak Ketiga</h2>
        <p className="text-sm text-muted-foreground">
          Data transaksi dibagikan kepada Midtrans untuk memproses pembayaran. File dan gambar disimpan
          melalui Supabase Storage. Notifikasi dikirim melalui penyedia layanan email dan WhatsApp pihak
          ketiga. Kami tidak menjual data pengguna kepada pihak ketiga mana pun.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">4. Penyimpanan &amp; Keamanan</h2>
        <p className="text-sm text-muted-foreground">
          Kata sandi disimpan dalam bentuk hash, tidak pernah dalam bentuk teks biasa. File digital dan
          invoice disimpan pada bucket privat dan hanya dapat diakses melalui tautan bertanda tangan yang
          memiliki masa berlaku terbatas.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">5. Hak Pengguna</h2>
        <p className="text-sm text-muted-foreground">
          Pengguna berhak mengakses, memperbarui, atau meminta penghapusan data pribadinya, sepanjang tidak
          bertentangan dengan kewajiban penyimpanan catatan transaksi yang berlaku.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">6. Cookie</h2>
        <p className="text-sm text-muted-foreground">
          Kami menggunakan cookie dan penyimpanan lokal peramban untuk menjaga sesi masuk pengguna dan
          preferensi tampilan.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">7. Perubahan Kebijakan</h2>
        <p className="text-sm text-muted-foreground">
          Kebijakan ini dapat diperbarui dari waktu ke waktu. Perubahan signifikan akan diberitahukan melalui
          platform atau email terdaftar.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">8. Kontak</h2>
        <p className="text-sm text-muted-foreground">
          Pertanyaan terkait privasi dapat diajukan melalui kontak yang tersedia pada platform.
        </p>
      </section>
    </div>
  );
};

export default KebijakanPrivasiPage;
