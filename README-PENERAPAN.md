# AQMarine — versi Supabase

Aplikasi telah dialihkan dari Firebase ke proyek Supabase `yxsauhjoqpfygmysjksx`. Warna merek rose/mauve, krem, dan emas dipertahankan. Login dan navigasi memakai Flaticon UIcons yang disimpan lokal; ikon operasional lain memakai Lucide.

## Status data

- 11 produk dengan stok gabungan 438 pcs.
- 25 transaksi September 2026 dengan omzet Rp11.499.750.
- 4 catatan restok.
- Data outlet, kanal penjualan, bazaar, subkategori, penyesuaian, dan distribusi stok lama tetap tersedia.
- Akun `owner@aqmarine.id` sudah terdaftar di Supabase Authentication.

## Pembaruan tampilan dan laporan

- Halaman **Barang masuk** tersedia di navigasi utama dengan 4 riwayat awal, ringkasan unit dan nilai pembelian, pencarian, ekspor CSV, serta tombol input restock.
- Ringkasan produk dari transaksi CSV diubah menjadi rincian item saat dibaca aplikasi.
- **Penjualan Aktual** di Laba & Rugi memakai total akhir transaksi setelah diskon, sehingga sama dengan **Total Omzet** untuk periode dan filter yang sama.
- Omzet transaksi campuran dibagi proporsional ke item Hijab dan Mukena; total kategori tetap sama dengan omzet keseluruhan.
- Tombol edit dan hapus tersedia untuk transaksi, barang masuk, mutasi, serta stok opname. Koreksi membalik dampak stok lama sebelum menerapkan perubahan baru.
- Data September 2026 terverifikasi: omzet Rp11.499.750, HPP Rp5.898.000, dan laba kotor Rp5.601.750.

Pembaruan CSV `Laporan_Transaksi_September_2026 (2).csv` menambahkan satu transaksi, `INV-260914-2976`, senilai Rp2.170.000 dan 17 unit. Snapshot inventori sebelumnya berisi 455 unit setelah 61 unit penjualan lama; transaksi tambahan ini menurunkan stok aktif menjadi 438 unit.

## Keamanan dan konsistensi

- Row Level Security menolak akses anonim.
- Pengguna terautentikasi hanya dapat membaca data bila emailnya cocok dengan profil staf aktif.
- Hak tulis diperiksa berdasarkan peran staf.
- Penjualan, edit penjualan, mutasi, opname, dan restok memakai transaksi PostgreSQL atomik serta pemeriksaan konflik.
- Kata sandi lama tidak disalin ke tabel aplikasi.

## Menjalankan aplikasi

```sh
npm install
npm run lint
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Konfigurasi browser publik tersedia di `.env.example`. Publishable key boleh berada di aplikasi browser karena akses data tetap dilindungi oleh RLS. Jangan menaruh secret key atau kata sandi database di kode.

## Hasil pemeriksaan

- TypeScript dan lint: lolos.
- Build produksi: lolos.
- 15 pengujian logika stok: lolos.
- Halaman login pratinjau lokal: berhasil tanpa error konsol.
- Supabase: stok 438, transaksi 25, omzet Rp11.499.750, HPP Rp5.898.000, akun owner terdaftar, RLS aktif, dan akses baca anonim ditolak.

## Berkas penting

- `dist/`: build yang siap di-host.
- `src/lib/supabase.ts`: koneksi, realtime, dan operasi data.
- `src/lib/auth.ts`: login Supabase.
- `src/lib/transactions.ts`: transaksi stok atomik.
- `supabase/migrations/20260915_app_migration.sql`: schema, seed, fungsi, dan kebijakan RLS.
- `supabase/data/20260915_transaction_update_2.sql`: pembaruan transaksi terbaru yang aman dijalankan ulang.

## Lisensi ikon

UIcons by Flaticon: https://www.flaticon.com/uicons

Lucide: https://lucide.dev/license
