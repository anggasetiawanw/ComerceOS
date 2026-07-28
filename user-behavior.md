# User Behavior Docs — Nagihin (working name, ex "Commerce OS")

> Nama kerja produk: **Nagihin** (dari "nagih + in") — dipilih karena menonjolkan diferensiasi asli produk ini (invoice & tagihan otomatis + database buyer), bukan sekadar storefront/link-in-bio seperti kompetitor. Belum dicek ketersediaan domain `.id`/handle sosial secara resmi — lakukan sebelum branding final.

Dokumen ini memetakan perilaku user (seller & buyer) di luar flow checkout otomatis "ideal" yang sudah dibahas di IA sebelumnya. Fokus: mengakomodasi seller yang tidak mau full-automated settlement, dan buyer yang terbiasa nego/chat dulu sebelum beli (perilaku umum di IG/TikTok/marketplace ala Alibaba).

## 1. Kenapa dokumen ini perlu ada

Asumsi awal (di IA/user flow sebelumnya): semua transaksi lewat storefront → checkout → bayar → invoice otomatis → dana masuk `available_balance`. Realitanya ada dua gap:

1. **Tidak semua buyer mau checkout langsung.** Banyak yang chat WA dulu — nanya stok, nego harga, custom request — baru mau bayar. Kalau produk kita paksa semua orang lewat form checkout kaku, sebagian transaksi hilang.
2. **Tidak semua seller mau uang langsung cair.** Seller yang jual produk fisik/custom takut chargeback atau refund request muncul setelah dana sudah ditarik. Mereka butuh jeda (settlement delay), bukan pencairan instan.

Dua behavior ini harus jadi bagian dari desain sistem, bukan edge case yang diabaikan.

## 2. Persona

### Seller

| Persona | Ciri | Kebutuhan sistem |
|---|---|---|
| **Instant Seller** | Jual produk digital/siap kirim (preset, template, produk fisik ready stock kecil), volume transaksi kecil-menengah, percaya sistem otomatis | Checkout langsung, settlement cepat, minim friksi |
| **Cautious Seller** | Jual produk custom/fisik bernilai lebih besar, pernah kena refund/chargeback di platform lain, atau baru pertama pakai sistem seperti ini | Mau approve/confirm manual sebelum order "final", settlement ada jeda, kontrol penuh atas kapan uang cair |

### Buyer

| Persona | Ciri | Kebutuhan sistem |
|---|---|---|
| **Direct Checkout Buyer** | Sudah yakin mau beli, tidak perlu nego, biasanya beli produk digital/harga fix | Flow checkout cepat (yang sudah dirancang di IA sebelumnya) |
| **Chat-First Buyer** | Mau nanya dulu (stok, ongkir, warna/varian, nego harga) sebelum commit bayar — pola paling umum di IG/TikTok/marketplace lokal | Jalur chat WA yang tetap tercatat sistem, bukan hilang di luar platform |

## 3. Dua Jalur Transaksi (Path A vs Path B)

### Path A — Self-service checkout (sudah dirancang sebelumnya)

```
Storefront → pilih produk → Beli → login Google → checkout → bayar → invoice otomatis → order "paid"
```
Cocok untuk Instant Seller + Direct Checkout Buyer. Ini jalur default, tetap jadi prioritas MVP karena paling mudah diotomatisasi dan paling murah secara operasional.

### Path B — Chat-first / manual confirmation (ala Alibaba "inquiry")

```
Storefront → pilih produk → tombol "Tanya dulu via WA" (selain tombol "Beli")
   → buka WA seller dengan pesan pre-filled (nama produk, link produk)
   → nego/tanya di luar sistem (WA)
   → seller balik ke dashboard → buat "Order Manual" untuk buyer ini
   → sistem generate invoice + link pembayaran (bisa dikirim manual via WA)
   → buyer bayar → seller tandai "Confirmed Paid" (atau webhook otomatis kalau bayar via link Midtrans/Xendit)
   → buyer otomatis tercatat ke buyer database seller (sama seperti Path A)
```

**Kenapa order manual tetap harus dibuat lewat sistem (bukan cuma transaksi WA murni):**
- Supaya buyer tetap masuk database (tujuan utama produk ini).
- Supaya ada invoice resmi (bukan sekadar chat "udah ya transfer aja").
- Supaya laporan keuangan (mini accounting) tetap akurat — kalau transaksi lewat WA murni tanpa dicatat, laporan HPP/profit jadi bohong.

**Desain kunci:** tombol "Tanya dulu via WA" di halaman produk itu tetap membuat record `inquiry` di sistem (status awal, belum ada uang) — bukan sekadar `wa.me` link biasa. Ini supaya seller punya jejak "siapa saja yang nanya tapi belum beli" (calon buyer lost), berguna untuk follow-up nanti.

## 4. Order Status — State Machine

Untuk mengakomodasi dua jalur di atas plus isu settlement, status order tidak cukup cuma "paid/pending". Diusulkan:

```
inquiry            → buyer nanya via WA, belum ada komitmen bayar (khusus Path B)
pending_payment     → order/invoice dibuat, menunggu pembayaran
paid                → pembayaran diterima (via gateway ATAU ditandai manual oleh seller)
holding             → dana sudah "paid" tapi BELUM masuk available_balance seller (masa tahan)
released            → masa tahan selesai, dana masuk available_balance → bisa di-withdraw
disputed            → buyer komplain/minta refund selama masa holding
refunded            → dana dikembalikan ke buyer, order ditutup
cancelled / expired  → order/invoice tidak dibayar dalam waktu tertentu, otomatis batal
```

Poin penting: **`paid` ≠ `released`.** Ini yang menjawab concern soal chargeback/refund — dana tidak otomatis "milik" seller begitu buyer bayar, ada jeda `holding` dulu.

## 5. Aturan Settlement (Holding Period)

Supaya tidak semua transaksi kena aturan sama (yang bikin Instant Seller merasa sistem lambat, tapi Cautious Seller merasa terlalu berisiko), holding period dibedakan by risk level:

| Tipe transaksi | Holding period disarankan | Alasan |
|---|---|---|
| Produk digital (langsung terkirim otomatis, low dispute risk) | Instant / T+0 → langsung `released` | Barang sudah diterima buyer saat itu juga, risiko refund rendah |
| Produk fisik ready-stock (checkout via Path A) | T+3 hari sejak `paid`, atau sejak status "dikirim" kalau ada input resi | Beri waktu buyer komplain kalau barang tidak sesuai |
| Produk custom / nilai besar / lewat Path B (manual) | T+7 hari, atau seller bisa pilih "tahan sampai saya release manual" | Risiko dispute lebih tinggi, seller custom order butuh kontrol lebih |

**Opsi per-seller (bukan cuma global):** di `dashboard/settings`, seller pilih mode settlement:
- **Auto-release** (ikut aturan holding period di atas, default)
- **Manual-release** (seller sendiri yang klik "Release dana" per order, tidak ada auto-release) — ini opsi untuk Cautious Seller yang tidak percaya sistem otomatis sama sekali.

Withdrawal sendiri (dari `available_balance` ke rekening) tetap manual/approve di MVP (sudah diputuskan sebelumnya) — jadi ada **dua lapis kontrol**: (1) kapan dana pindah dari `holding` ke `available_balance`, (2) kapan `available_balance` dicairkan ke rekening. Cautious Seller bisa mengontrol keduanya secara manual.

## 6. Skenario Dispute / Refund

| Skenario | Trigger | Sistem behavior |
|---|---|---|
| Buyer komplain sebelum dana `released` | Buyer klik "Laporkan masalah" di halaman order, atau seller sendiri input manual (dari chat WA) | Order pindah ke `disputed`, dana yang masih `holding` dibekukan, tidak bisa di-release sampai resolved |
| Buyer komplain setelah dana `released` (sudah masuk `available_balance` tapi belum di-withdraw) | Sama seperti di atas | Sistem tandai order `disputed`, tapi karena dana sudah campur ke saldo umum seller — refund jadi tanggung jawab manual seller (sistem hanya catat, tidak bisa "tarik lagi" otomatis) — ini alasan kenapa holding period penting supaya kasus ini minim terjadi |
| Buyer komplain setelah dana ditarik ke rekening seller | Sama | Di luar kendali sistem — perlu kebijakan (mis. deposit/reserve balance untuk seller volume tinggi) — **belum perlu di-solve di MVP**, cukup dicatat sebagai risiko dan pertimbangan kebijakan ToS |

## 7. Ringkasan Perbedaan Perilaku: Path A vs Path B

| Aspek | Path A (Self-checkout) | Path B (Chat-first/manual) |
|---|---|---|
| Siapa yang bikin order | Buyer sendiri | Seller (setelah chat manual) |
| Kecepatan | Instan | Tergantung respons seller di WA |
| Cocok untuk | Produk digital/fix price | Produk custom/nego/fisik nilai besar |
| Butuh login Google buyer? | Ya, saat checkout | Ya, tetap — tapi bisa dilakukan seller-assisted (seller share link checkout setelah nego selesai, buyer tinggal login+bayar) |
| Data masuk buyer database? | Otomatis | Otomatis (asal seller buat order via sistem, bukan transaksi WA murni di luar sistem) |
| Risiko dispute | Lebih rendah (produk jelas, harga fix) | Lebih tinggi (custom, ekspektasi bisa beda) |

## 8. Implikasi ke Desain Produk (untuk fase berikutnya)

- Tombol "Tanya dulu via WA" perlu ditambahkan di halaman produk (Path B), berdampingan dengan tombol "Beli" (Path A) — bukan menggantikan.
- Dashboard seller butuh menu **"Buat Order Manual"** (bagian dari Path B) — form sederhana: pilih/ketik produk, harga (bisa override untuk hasil nego), data buyer (kalau buyer belum punya akun, seller bisa input manual dulu, baru diverifikasi buyer saat bayar).
- Status order butuh diperluas dari sekadar `paid/pending` jadi mengikuti state machine di bagian 4.
- Field baru dibutuhkan di skema data: `settlement_mode` (per seller: auto/manual), `holding_until` (per order), `released_at`.
- Ini semua berarti skema database (yang sempat ditawarkan sebagai next step) perlu dirancang dengan state machine order ini sejak awal, bukan ditambah belakangan.

---

## 9. Keputusan Settlement (resolved)

Menjawab tiga pertanyaan terbuka sebelumnya:

- **Default holding period: ON untuk semua seller**, pakai tabel tiered di bagian 5 (instan/T+3/T+7). Alasan: mayoritas seller tidak akan pernah sentuh `settings`, jadi default itu yang berlaku ke hampir semua transaksi — proteksi buyer harus ada tanpa syarat opt-in.
- **Manual-release: opt-in, tapi hanya boleh memperpanjang hold, bukan mempersingkat.** Yang sebenarnya berisiko bukan seller menahan uangnya sendiri lebih lama (itu hak dia), tapi seller mencairkan **terlalu cepat** sebelum jendela komplain buyer selesai. Jadi kuncinya adalah **floor minimum yang dipaksakan platform** (mis. produk fisik tidak akan pernah bisa `released` sebelum T+3, walau seller pilih manual-release). Ini menutup celah abuse tanpa perlu logika "cap maksimal" yang rumit.
  - Safety-net tambahan: kalau seller pilih manual-release tapi lupa klik "Release" berminggu-minggu, sistem auto-force-release setelah batas wajar (mis. 30 hari) — murni operasional, bukan soal fraud.
- **Reserve balance untuk seller volume tinggi: ditunda ke fase lanjut**, bukan MVP. Kalau nanti dibutuhkan, pola lazimnya: tahan sekian persen (mis. 10%) dari tiap payout selama beberapa hari sebagai reserve — baru relevan setelah ada data dispute rate riil.

## 10. Produk Digital (replikasi pola Lynk.id)

- Tambah field `product_type`: `digital` | `physical` | `service` (service = jalur Path B/custom nego).
- Produk digital: seller upload file saat create produk (Supabase Storage). Setelah order `paid`, sistem generate **signed URL** (expire 24-48 jam, limit unduh mis. 3x) dan dikirim ke invoice + halaman order buyer.
- Produk digital otomatis masuk kategori **instant release** di tabel holding (bagian 5) — barang sudah "diterima" saat itu juga, risiko dispute rendah.
- Opsional (fase lanjut): "license key pool" yang di-assign otomatis per pembelian, untuk produk software/lisensi.

## 11. Riwayat (Buyer History)

Gap yang belum tercakup di IA sebelumnya: buyer bisa belanja dari banyak seller berbeda di platform ini (identitas login Google bersifat global), jadi butuh dashboard sendiri di sisi buyer:

```
/akun (dashboard buyer, lintas-seller)
├── Riwayat semua order (dari semua seller yang pernah dibeli)
├── Invoice & link unduh ulang produk digital
└── Kontak WA ke seller kalau ada masalah
```

Ini juga memperkuat network effect kecil yang sudah disinggung di flow checkout — makin sering platform dipakai, makin lengkap data buyer saat checkout di toko baru manapun.

## 12. Penanganan Diskon

Menu baru `/dashboard/promotions`:

- Tipe: persen atau nominal tetap.
- Batas pakai: total penggunaan & per-buyer, masa berlaku, scope (semua produk / produk tertentu), minimum pembelian (opsional).
- **Fitur kunci untuk konteks bio TikTok/IG:** link produk dengan kode promo auto-apply (`/@username/produk/slug?promo=KODE`) — seller share link itu di caption/story, buyer klik langsung dapat harga diskon tanpa input manual kode. Growth loop kecil ala Saweria.
- Order menyimpan `discount_code` dan `discount_amount` supaya laporan gross profit tetap akurat (dihitung dari harga setelah diskon, bukan harga asli).
- Guardrail sederhana: kalau diskon membuat harga jual di bawah HPP, sistem beri warning ke seller (bukan blocking) — supaya seller sadar margin, bukan dipaksa.

## 13. Settlement Midtrans (Level Platform)

Nagihin adalah **satu-satunya merchant account** di mata Midtrans — semua uang dari semua buyer, dari semua seller di platform, masuk ke satu akun Midtrans milik Nagihin, bukan langsung ke rekening masing-masing seller. Ini menambah satu lapis settlement yang belum masuk perhitungan holding period sebelumnya.

**Dua lapis settlement yang numpuk:**
1. **Midtrans → rekening bank Nagihin:** minimum **T+3 hari kerja** setelah transaksi sukses, baru bisa ditarik (bisa diatur auto-withdraw harian/mingguan/bulanan ke rekening Nagihin).
2. **Rekening Nagihin → seller** (`available_balance` → withdraw): mengikuti holding period internal (bagian 5 & 9) — instan/T+3/T+7 tergantung tipe produk.

**Implikasi:** untuk produk fisik, total waktu sebelum seller benar-benar bisa withdraw jadi sekitar **T+6 hari kerja** (T+3 Midtrans + T+3 internal), bukan T+3 seperti asumsi awal. Ini harus dikomunikasikan jujur ke seller di awal (expectation setting) karena lebih lambat dari pencairan marketplace besar (Shopee/Tokopedia).

**Praktik operasional wajib supaya platform owner tidak "kelabakan":**
- **Pisahkan secara akuntansi** (bukan cuma UI) antara `total_seller_liability` (dana masih `holding`/`available_balance` milik seller — ini utang Nagihin ke seller) vs `platform_revenue` (fee yang sudah benar-benar hak Nagihin). Saldo di rekening bank Nagihin sebagian besar bukan revenue — jangan dianggap kas bebas pakai.
- **Fee platform baru "recognized" setelah holding period order itu selesai** — sama seperti aturan release untuk seller, supaya kalau ada refund, fee yang sudah "dianggap" milik platform tidak keburu terpakai.
- **Rekonsiliasi harian wajib ada sejak MVP** — cocokkan laporan settlement Midtrans dengan order internal, supaya cepat ketahuan kalau ada order "paid" di sistem tapi uangnya tidak benar-benar settle (webhook gagal, dsb).
- **Simpan dana titipan seller di rekening yang terpisah dari kas operasional Nagihin**, bukan dicampur — praktik defensif sebelum volume besar.
- **Migrasi payout otomatis nanti pakai Midtrans Payouts (dulu bernama Iris)** — produk disbursement Midtrans yang memang didesain untuk platform/marketplace yang bayar ke banyak seller sekaligus (transfer real-time ke bank & e-wallet). Ini pengganti konkret untuk placeholder "Xendit/Midtrans Disbursement API" yang disebut di bagian withdrawal sebelumnya — tidak perlu cari provider terpisah, tinggal upgrade dari Snap ke Snap+Payouts saat sudah waktunya.

**Flag regulasi:** karena Nagihin secara teknis memegang dana buyer sebelum diteruskan ke seller, pola ini termasuk yang diawasi BI/OJK sebagai aktivitas **PJP (Penyelenggara Jasa Pembayaran)/payment aggregator**. Untuk skala kecil di awal biasanya belum masalah, tapi begitu GMV signifikan, perlu konsultasi ke yang paham regulasi fintech lokal — bukan sesuatu yang bisa dipastikan kepastian hukumnya di sini.

## 14. Model Monetisasi (Freemium Hybrid)

Karena Nagihin adalah merchant-of-record, fee platform bisa dipotong langsung di level ledger sebelum kredit ke `available_balance` seller — tidak perlu billing terpisah ke seller.

Model yang direkomendasikan mengikuti pola yang sudah tervalidasi Lynk.id di pasar Indonesia:

| Tier | Fee per transaksi | Biaya bulanan | Fitur |
|---|---|---|---|
| **Free** | 5% | Rp0 | Storefront dasar, checkout, invoice otomatis, buyer database dasar |
| **Pro** | 2-3% | Rp49-99k/bulan (opsional) | Custom domain, diskon/promo, export buyer, laporan HPP lengkap |

Alasan: zero friksi untuk seller baru coba (tidak perlu commit bulanan sebelum lihat hasil), fee menutup MDR Midtrans + buffer (perlu dihitung ulang begitu tahu rate MDR aktual per channel bayar dari kontrak merchant), dan upgrade ke Pro jadi upsell natural begitu seller mulai serius — bukan dipaksa di awal.

## 15. Arsitektur Payment: Model 1 vs Model 2 (Keputusan)

Ada dua model arsitektur payment yang bisa dipakai, beda secara fundamental soal siapa yang "memegang" uang seller:

| Aspek | Model 1 — Merchant-of-record + disbursement (Midtrans Snap + Payouts/Iris) | Model 2 — Split payment / sub-akun (mis. Xendit xenPlatform) |
|---|---|---|
| Cara kerja | Semua uang masuk ke akun Midtrans & rekening bank Nagihin dulu, baru sistem/kita trigger payout ke seller via Payouts/Iris API | Seller jadi sub-akun di bawah akun master Nagihin; saat buyer bayar, dana otomatis ke-split — porsi seller & porsi fee kita masing-masing langsung ke akun tujuan |
| Siapa yang "pegang" uang seller dulu | Nagihin (custodial penuh) | Diminimalkan — split otomatis saat transaksi |
| Kontrol atas holding period/dispute logic (bagian 5-9) | Penuh di tangan kita, paling fleksibel | Sebagian ikut aturan settlement PSP sub-akun — belum dikonfirmasi detailnya |
| Friksi onboarding seller | Rendah — cukup input rekening bank buat withdrawal | Lebih tinggi — kemungkinan tiap seller perlu KYC sendiri ke PSP saat didaftarkan jadi sub-akun |
| Risiko regulasi/custodial (PJP) buat Nagihin | Lebih tinggi (lihat bagian 13) | Lebih rendah secara desain, tapi status hukum akun master tetap perlu dicek |
| Kecepatan build MVP | Lebih cepat — satu integrasi (Snap) | Lebih lama — dua sistem (checkout + onboarding sub-akun) |

**Keputusan: pakai Model 1 untuk MVP dan fase awal.** Alasan utama: friksi onboarding seller harus serendah mungkin (growth loop kita bergantung pada "gampang setup" ala Saweria — KYC sub-akun akan menghambat itu), dan seluruh desain holding-period/dispute (bagian 5-9) paling gampang diimplementasi kalau Nagihin yang pegang kendali penuh timing settlement.

**Trigger migrasi ke Model 2 (bukan sekarang, dicatat untuk nanti):**
- GMV sudah cukup besar sehingga concern regulasi PJP (bagian 13) jadi serius, ATAU
- Seller mulai ragu soal keamanan dana ("kok uang saya ditahan startup kecil") dan butuh rasa aman lebih dari nama besar PSP.

Arsitektur ledger di bagian 13-14 (pemisahan `total_seller_liability` vs `platform_revenue`) tetap kompatibel untuk kedua model, jadi migrasi nanti tidak perlu bongkar total desain data.

---

**Belum diputuskan / perlu didiskusikan lebih lanjut:**
- Skema database final untuk mendukung state machine order + product_type + promotions + ledger seller-liability vs platform-revenue (langkah berikutnya).
- Ketersediaan domain `.id` dan handle sosial untuk nama "Nagihin" — perlu dicek langsung sebelum branding final.
- Rate MDR aktual Midtrans per channel pembayaran (QRIS/VA/e-wallet/kartu kredit) — perlu dicek dari kontrak merchant untuk pastikan fee 5%/2-3% di atas tetap profitable.
- Detail settlement timing sub-akun di Model 2 (Xendit xenPlatform atau sejenis) — belum dikonfirmasi, baru perlu digali saat mendekati waktu migrasi.
