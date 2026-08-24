# Panduan Deploy & Troubleshooting

## 0. Prasyarat
- Firebase CLI: `npm install -g firebase-tools`
- Login: `firebase login`
- **Upgrade project ke Blaze plan** di Firebase Console (Cloud Functions & Firestore
  triggers butuh Blaze; Firestore read/write sendiri tetap gratis di kuota harian).
- **Pastikan Firestore Database sudah dibuat.** Kalau project baru: Firebase Console
  → Firestore Database → Create Database → mode **Production** → region
  `asia-southeast2` (Jakarta). Kalau langkah ini belum pernah dilakukan, semua
  query dari situs akan gagal walau kode-nya benar.

## 1. Deploy Firestore rules & index
```bash
firebase deploy --only firestore:rules,firestore:indexes
```
Tanpa ini, rules default Firestore (production mode) menolak SEMUA baca/tulis,
termasuk membaca daftar produk di halaman topup.

## 2. Isi data produk ke Firestore (pilih SALAH SATU cara)

### Cara A — dari browser, tanpa install apa pun (disarankan)
1. Deploy rules sementara:
   ```bash
   firebase deploy --only firestore:rules --rules firestore.rules.seed-temp
   ```
2. Buka `https://hekaapedia.web.app/tools/seed-once.html`
3. Login pakai akun apa saja (daftar dulu di situs kalau belum punya), lalu
   klik **"Seed 90 Produk ke Firestore"**
4. **Segera setelah selesai**, kembalikan rules yang aman:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (langkah ini WAJIB — rules sementara membuka akses tulis produk untuk
   siapa saja yang berhasil login)

### Cara B — dari terminal (kalau punya Node.js)
```bash
cd scripts
npm init -y && npm install firebase-admin
```
1. Firebase Console → Project Settings → Service Accounts → **Generate new private key**
2. Simpan sebagai `scripts/serviceAccountKey.json` (JANGAN commit/upload file ini)
3. Jalankan dari root folder:
   ```bash
   node scripts/seedProducts.js
   ```

Kedua cara mengisi data yang sama, dari sumber yang sama:
`data/products-seed.mjs`. Kalau mau ubah harga di masa depan, edit file itu,
lalu jalankan ulang salah satu cara di atas (aman dijalankan berkali-kali).

## 3. Deploy Cloud Functions (validasi harga server-side)
```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```
Function `createOrder` berjalan di region `asia-southeast2`. Kalau mau region
lain, ubah `REGION` di `functions/index.js` **dan** parameter kedua
`getFunctions(app, "...")` di `js/firebase-init.js` — dua-duanya harus sama.

## 4. Aktifkan Firebase Authentication
Firebase Console → Authentication → Sign-in method → aktifkan **Email/Password**.
Tanpa ini, tombol Login/Daftar gagal dengan error `auth/operation-not-allowed`.

## 5. Deploy Hosting
```bash
firebase deploy --only hosting
```

---

## Troubleshooting: "Pricelist / daftar nominal tidak muncul"
Cek berurutan:
1. **Buka DevTools (F12) → tab Console** di halaman yang bermasalah (mis.
   `freefire.html`). Kalau ada error merah, itu petunjuk utamanya.
2. Firestore Database belum dibuat di Console → lihat langkah 0 di atas.
3. `firestore.rules` belum pernah di-deploy → jalankan langkah 1.
4. Koleksi `products` masih kosong → jalankan langkah 2 (Cara A paling cepat).
5. Kalau grid tetap kosong tapi tidak ada error: cek di Firestore Console
   apakah dokumen di koleksi `products` field `category`-nya PERSIS sama
   dengan yang dipakai halaman (mis. halaman Free Fire pakai `"freefire"`,
   huruf kecil semua, tanpa spasi) — lihat `window.HEKA_PAGE_CONFIG` di
   bagian bawah tiap file `html/*.html`.

## Setelah deploy — cara tes cepat
1. Buka `freefire.html`, pastikan daftar nominal Diamond muncul.
2. Klik **Daftar**, buat akun baru → cek Firestore Console, dokumen
   `users/{uid}` dengan `points: 0` harus muncul.
3. Pilih nominal + Qris/Cash, isi User ID & no WA, klik **Lanjutkan Pembelian**
   → cek Firestore Console, dokumen baru muncul di `orders` dengan status
   `pending_confirmation` dan `total` yang benar (dihitung server, bukan browser).
4. Klik **Konfirmasi ke Admin** → harus membuka WhatsApp dengan pesan terisi.

## Yang masih manual (di luar prioritas tinggi #1–#5)
- **Menandai order selesai**: masih manual lewat Firestore Console (ubah field
  `status` order jadi `"completed"`). Saat itu terjadi, Cloud Function
  `onOrderCompleted` otomatis menambah poin ke akun pembeli.
- Payment gateway otomatis (Midtrans/Xendit) untuk Gopay/OVO/Dana — masih
  "Dalam Pengerjaan" seperti semula, sengaja belum diaktifkan supaya situs
  tidak menerima pembayaran tanpa gateway yang benar-benar terintegrasi.
- `tools/seed-once.html` sebaiknya dihapus dari hosting production setelah
  tidak diperlukan lagi (bukan halaman untuk pengunjung biasa).
