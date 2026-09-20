# AQMarine Inventory — Project Handoff

Dokumen ini disiapkan agar pekerjaan dapat dilanjutkan dari akun Codex lain tanpa bergantung pada riwayat percakapan sebelumnya. Jangan menaruh password, token GitHub, secret Supabase, service-role key, atau kredensial Cloudflare di repository.

## Ringkasan proyek

- Repository GitHub: `https://github.com/luvnie4/aqmarine_inv`
- Branch utama: `main`
- Folder kerja lokal saat handoff: `C:\Users\canto\Documents\Codex\2026-09-10\bi\work\publish\aqmarine_inv`
- Situs produksi: `https://aqmarine-inventory.pages.dev/`
- Cloudflare Pages project: `aqmarine-inventory`
- Cloudflare account ID: `a015b5e8c8ca664aa76098bc10ae46ba`
- Supabase project ref: `yxsauhjoqpfygmysjksx`
- Supabase URL: `https://yxsauhjoqpfygmysjksx.supabase.co`
- Stack: React 19, TypeScript, Vite, Tailwind CSS, Supabase Auth/Postgres/Realtime, Cloudflare Pages.

Firebase sudah tidak menjadi database aktif. Data operasional aplikasi berada di Supabase.

## Kondisi terakhir yang telah diverifikasi

Data terakhir diverifikasi pada 16 September 2026:

- 11 produk.
- 25 transaksi penjualan September 2026.
- 78 item terjual.
- Omzet Rp11.499.750.
- HPP Rp5.898.000.
- Laba kotor Rp5.601.750.
- 4 catatan barang masuk/restok.
- 5 catatan koreksi mutasi stok.
- 1 catatan stok opname/penyesuaian.
- Total stok aktif 438 unit.

Distribusi stok akhir:

| Lokasi | Stok |
| --- | ---: |
| Toko Utama AQMARINE | 321 |
| Toko 2 EOMF Ci Walk | 114 |
| Toko 3 Baltos | 3 |
| **Total** | **438** |

Rekonsiliasi total:

`453 stok awal + 63 barang masuk - 78 penjualan = 438 stok akhir`

Lima mutasi koreksi memindahkan 10 unit dari Ciwalk ke Toko Utama dan tidak mengubah total stok. Nomornya `TRF-KOR-260916-001` sampai `TRF-KOR-260916-005`, dengan catatan rekonsiliasi stok fisik 16 September 2026.

## Posisi stok per produk

U/C/B berarti Toko Utama/Ciwalk/Baltos.

| SKU | Produk | Awal U | Awal C | Awal B | Restok | Terjual | Akhir U | Akhir C | Akhir B | Total akhir |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| AQM-HJB-6467 | Arabian Voal Standart | 32 | 11 | 0 | 21 | 15 | 40 | 9 | 0 | 49 |
| AQM-HJB-5561 | Arabian Voal Syar'i | 10 | 6 | 0 | 21 | 12 | 23 | 2 | 0 | 25 |
| AQM-HJB-2090 | Motif Medium | 99 | 29 | 0 | 0 | 4 | 98 | 26 | 0 | 124 |
| AQM-HJB-8092 | Motif Premium Standart | 8 | 0 | 0 | 20 | 11 | 17 | 0 | 0 | 17 |
| AQM-HJB-8002 | Motif Premium Syar'i | 14 | 0 | 0 | 0 | 2 | 12 | 0 | 0 | 12 |
| AQM-HJB-4383 | Paris Viena | 19 | 11 | 0 | 1 | 11 | 12 | 8 | 0 | 20 |
| AQM-HJB-5700 | Pashmina Tencel | 11 | 8 | 0 | 0 | 1 | 10 | 8 | 0 | 18 |
| AQM-HJB-4460 | Pashmina Viscose | 8 | 12 | 0 | 0 | 3 | 8 | 9 | 0 | 17 |
| AQM-MKN-4039 | Mukena Natural Silk | 62 | 11 | 3 | 0 | 7 | 57 | 9 | 3 | 69 |
| AQM-MKN-2363 | Mukena Travel Motif | 29 | 25 | 0 | 0 | 8 | 27 | 19 | 0 | 46 |
| AQM-MKN-6568 | Mukena Travel Polos | 20 | 25 | 0 | 0 | 4 | 17 | 24 | 0 | 41 |

## Aturan bisnis yang wajib dipertahankan

1. Stok dicatat per toko fisik/outlet, bukan hanya sebagai total produk.
2. Penjualan toko mengurangi stok outlet yang dipilih sebagai sumber stok.
3. Saat transaksi penjualan diedit, sistem mengembalikan stok ke sumber lama sebelum menerapkan transaksi baru.
4. Saat transaksi penjualan dihapus, stok dikembalikan ke sumber asli transaksi.
5. Bazaar/Event adalah saluran penjualan, bukan lokasi stok.
6. Semua penjualan Bazaar/Event selalu mengurangi stok Toko Utama AQMARINE.
7. Jika barang Bazaar secara fisik diambil dari Ciwalk, catat mutasi Ciwalk ke Toko Utama terlebih dahulu. Setelah itu transaksi Bazaar tetap mengurangi Toko Utama.
8. Badge Bazaar/Event berwarna kuning/amber. Badge toko fisik berwarna hijau.
9. Baris laporan Bazaar menampilkan nama event dan teks `Stok: Toko Utama AQMARINE`.
10. Edit/hapus barang masuk, mutasi, opname, dan penjualan harus membalik dampak stok lama secara atomik sebelum menerapkan perubahan baru.
11. Jangan memperbaiki perbedaan cabang dengan mengubah total stok produk secara langsung. Gunakan mutasi jika total perusahaan benar, dan gunakan opname bila hitungan fisik memang mengubah total.

## Transaksi 17 item yang penting

Transaksi `INV-260914-2976` adalah Bazaar Ultah RSHS tanggal 14 September 2026, senilai Rp2.170.000 dan berisi 17 item. Snapshot inventori lama berjumlah 455 setelah 61 item penjualan. Transaksi tambahan ini membuat jumlah penjualan menjadi 78 dan stok aktif menjadi 438.

Jangan mengembalikan 17 item tersebut ke stok tanpa bukti transaksi dibatalkan. Hitungan fisik per SKU telah dicocokkan dan sesuai dengan stok 438.

## Fitur yang sudah tersedia

- Login Supabase dan profil staf berbasis RLS.
- Dashboard stok dan nilai inventori.
- Penjualan toko dan Bazaar/Event.
- Barang masuk/restok.
- Mutasi stok antartoko.
- Stok opname.
- Edit dan hapus untuk penjualan, restok, mutasi, dan opname.
- Laporan dengan filter saluran, kategori, SKU, metode pembayaran, periode, dan urutan tanggal.
- Total transaksi, total item, dan omzet mengikuti filter laporan.
- Kalender aktivitas penjualan, barang masuk, mutasi, dan opname.
- Laba rugi dengan Penjualan Aktual yang sama dengan Total Omzet pada periode/filter yang sama.
- Ekspor CSV.
- Realtime refresh dari Supabase.

## Berkas penting

- `src/App.tsx`: pemuatan koleksi, state utama, dan penghubung aksi UI.
- `src/lib/supabase.ts`: akses Supabase, RPC, profil staf, dan realtime.
- `src/lib/auth.ts`: autentikasi dan pemeriksaan profil staf.
- `src/lib/transactions.ts`: commit/edit/hapus transaksi dan pergerakan stok secara atomik.
- `src/lib/stock.ts`: logika menerapkan dan membalik penjualan/restok/mutasi/opname.
- `src/lib/salesRouting.ts`: penentuan saluran dan sumber stok Bazaar/toko, termasuk data lama.
- `src/components/SalesEntryView.tsx`: input penjualan.
- `src/components/EditTransactionModal.tsx`: edit transaksi dengan pemulihan stok lama.
- `src/components/ReportsView.tsx`: laporan dan filter.
- `src/components/ActivityCalendarView.tsx`: kalender aktivitas.
- `src/components/TransfersView.tsx`: riwayat mutasi.
- `src/components/InventoryView.tsx`: stok produk dan distribusi outlet.
- `supabase/migrations/20260915_app_migration.sql`: schema awal, fungsi, seed, dan RLS.
- `supabase/migrations/20260915_correction_workflows.sql`: transaksi koreksi atomik.
- `supabase/data/20260915_transaction_update_2.sql`: impor transaksi terbaru.
- `tests/stock.test.ts`: pengujian aturan stok.
- `README-PENERAPAN.md`: ringkasan penerapan Supabase.

Folder `.tools`, `.gh-config`, `.wrangler-config`, dan file `.env*` diabaikan Git. Folder tersebut dapat berisi alat bantu atau kredensial lokal dan tidak boleh dimasukkan ke repository.

## Menjalankan dan memeriksa aplikasi

```powershell
npm install
npm run lint
npm run test:stock
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Konfigurasi publik browser tersedia di `.env.example`. Publishable key Supabase boleh berada di aplikasi browser karena akses data tetap dibatasi RLS. Jangan menggantinya dengan service-role key.

## Database dan keamanan

Data aplikasi disimpan dalam tabel `public.app_documents` sebagai dokumen JSON per koleksi. Operasi penting menggunakan fungsi PostgreSQL berikut:

- `save_aqmarine_document`
- `delete_aqmarine_document`
- `commit_aqmarine_documents`

RLS harus tetap aktif. Akses anonim ditolak. Pengguna terautentikasi harus memiliki profil staf aktif. Perubahan stok dan dokumen terkait harus dikirim dalam satu panggilan `commit_aqmarine_documents` dengan nilai `expected` untuk mendeteksi konflik.

Akun aplikasi yang diketahui:

- `owner@aqmarine.id`
- `superadmin@aqmarine.id`
- `irma@aqmarine.id`

Password tidak dicatat di repository. Bila akun Codex baru perlu mengelola Supabase, GitHub, atau Cloudflare, login melalui dashboard masing-masing atau gunakan akses yang diberikan pemilik akun. Jangan meminta password atau secret ditempelkan ke chat.

## Deployment

Build produksi dibuat dengan `npm run build` dan menghasilkan folder `dist`.

Cloudflare Pages:

- Project: `aqmarine-inventory`
- Production URL: `https://aqmarine-inventory.pages.dev/`
- Build command: `npm run build`
- Output directory: `dist`

Setelah deploy, verifikasi minimal:

1. Login berhasil.
2. Total stok tampil 438 jika belum ada transaksi baru.
3. Mutasi koreksi tampil lima baris.
4. Transaksi Bazaar menampilkan badge amber dan sumber Toko Utama.
5. Filter SKU laporan mengubah jumlah transaksi, item, dan omzet.
6. Console browser tidak menampilkan error aplikasi.

## Git dan perubahan terakhir

Commit penting saat handoff:

- `1e02a6b` — menyelaraskan stok cabang dan sumber Bazaar.
- `498c3f4` — menambahkan total filter dan kalender aktivitas.
- `f470409` — menambahkan filter SKU dan urutan tanggal laporan.
- `e9a2dcf` — audit stok dan koreksi data atomik.
- `d31be0b` — modul barang masuk dan peningkatan UI.

Sebelum mulai bekerja dari akun baru:

```powershell
git status
git pull --ff-only origin main
npm install
npm run lint
npm run test:stock
npm run build
```

Jika hasil database sudah berubah karena transaksi baru setelah tanggal handoff, gunakan data Supabase terbaru sebagai sumber kebenaran. Jangan memaksa angka kembali ke 438.

## Prompt awal untuk akun Codex baru

Gunakan prompt berikut setelah membuka repository:

> Baca `PROJECT_HANDOFF.md` dan `README-PENERAPAN.md` terlebih dahulu. Proyek aktif adalah AQMarine Inventory pada branch `main`, menggunakan Supabase dan di-host di Cloudflare Pages. Pertahankan seluruh aturan bisnis stok, khususnya stok per outlet dan Bazaar selalu mengambil stok Toko Utama. Periksa status Git dan jalankan lint, test stok, serta build sebelum mengubah kode. Jangan mengubah database produksi sebelum menjelaskan hasil audit dan dampak stoknya.
