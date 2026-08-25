# Panduan Deploy & Troubleshooting (Spark Plan / Gratis)

Project ini didesain supaya jalan 100% di **Spark plan (gratis)** — tidak ada
langkah yang butuh kartu kredit atau upgrade Blaze.

## 0. Prasyarat
- Firebase CLI: `npm install -g firebase-tools`
- Login: `firebase login`
- **Pastikan Firestore Database sudah dibuat.** Firebase Console → project
  hekaapedia → Firestore Database → kalau belum ada, klik "Create Database"
  → mode **Production** → region `asia-southeast2` (Jakarta).
- Firebase Console → Authentication → Sign-in method → aktifkan
  **Email/Password**. Tanpa ini tombol Login/Daftar gagal terus.

## 1. Deploy rules, index, dan hosting
```bash
firebase deploy
```
Satu perintah ini sudah cukup — `firebase.json` sekarang cuma berisi
`hosting` dan `firestore` (rules + indexes), tidak ada `functions` lagi,
jadi tidak akan ada percobaan deploy Cloud Functions yang gagal karena
Spark plan.

## 2. Isi data produk ke Firestore (sekali di awal, atau tiap ganti harga)

### Cara A — dari browser, tanpa install apa pun (disarankan)
1. Deploy rules sementara:
   ```bash
   firebase deploy --only firestore:rules --rules firestore.rules.seed-temp
   ```
2. Buka `https://hekaapedia.web.app/tools/seed-once.html`
3. Login (daftar dulu di situs kalau belum punya akun), klik
   **"Seed Produk ke Firestore"**
4. **Segera setelah selesai**, kembalikan rules yang aman:
   ```bash
   firebase deploy --only firestore:rules
   ```

### Cara B — dari terminal (kalau punya Node.js)
```bash
cd scripts && npm install firebase-admin
```
1. Firebase Console → Project Settings → Service Accounts → **Generate new private key**
2. Simpan sebagai `scripts/serviceAccountKey.json` (JANGAN commit/upload file ini)
3. Dari root folder: `node scripts/seedProducts.js`

Kedua cara mengisi data yang sama dari sumber yang sama:
`data/products-seed.mjs`. Edit harga di sana, lalu ulangi salah satu cara
di atas kalau mau update (aman dijalankan berkali-kali).

## 3. (Disarankan) Email verify order ke admin — tetap gratis

Supaya tiap order baru otomatis mengirim **email ke `hekoding@gmail.com`**
dengan tombol **Verify** (klik → order `completed` → poin user masuk), pasang
backend Google Apps Script (gratis, tanpa Blaze). Panduan lengkap ada di
[`apps-script/README.md`](apps-script/README.md). Tanpa langkah ini, situs
tetap jalan — admin cukup menandai order `completed` manual lewat Firestore
Console seperti biasa.

---

## Cara kerja order & poin (tanpa Cloud Functions)
- Saat pembeli klik "Lanjutkan Pembelian", `js/checkout.js` mengambil ulang
  harga produk LANGSUNG dari Firestore, lalu menulis dokumen baru ke
  `orders`. `firestore.rules` mencocokkan setiap field harga terhadap
  dokumen produk aslinya sebelum write itu diizinkan — kalau ada yang tidak
  cocok (mis. harga dimanipulasi lewat DevTools), Firestore sendiri yang
  menolak. Ini menggantikan peran Cloud Function validasi harga, tapi
  gratis.
- Tiap ada order baru, admin (`hekoding@gmail.com`) menerima **email**
  otomatis berisi detail order + tombol **Verify** (backend gratis Google
  Apps Script — lihat `apps-script/README.md`). Setelah item game masuk /
  pelanggan dilayani, admin klik **Tandai Selesai** di halaman itu → order
  jadi `"completed"`. (Masih bisa juga diubah manual lewat Firestore Console
  kalau perlu.)
- Begitu pembeli membuka halaman **Profil**, sistem otomatis mengecek order
  miliknya yang sudah `completed` dan mengklaim poinnya (1 dokumen di
  `users/{uid}/pointClaims/{orderId}`, nilainya divalidasi rules langsung
  dari `order.total` — tidak bisa dipalsukan). Total poin yang ditampilkan
  di halaman Profil = jumlah semua klaim itu.

## Troubleshooting: "Pricelist / daftar nominal tidak muncul"
1. Buka DevTools (F12) → tab Console di halaman yang bermasalah.
2. Firestore Database belum dibuat → lihat langkah 0.
3. `firestore.rules` belum pernah di-deploy → jalankan langkah 1.
4. Koleksi `products` masih kosong → jalankan langkah 2.
5. Cek `category` di dokumen Firestore persis sama dengan
   `window.HEKA_PAGE_CONFIG.category` di bagian bawah file `html/*.html`.

## Troubleshooting: "Gagal membuat order: data tidak valid"
Ini muncul kalau `firestore.rules` menolak write karena field yang dikirim
tidak cocok dengan dokumen produk (biasanya harga produk baru saja diubah
tapi halaman belum di-refresh). Minta pembeli muat ulang halaman lalu coba
lagi. Kalau tetap gagal, cek Firestore Console → koleksi `products` →
pastikan field `active` bernilai `true` dan `price` berupa angka (bukan teks).

## Cara tes cepat setelah deploy
1. Buka `html/freefire.html`, pastikan daftar nominal Diamond muncul.
2. Daftar akun baru dari tombol Daftar.
3. Pilih nominal + Qris/Cash, isi User ID & no WA, klik "Lanjutkan
   Pembelian" → cek Firestore Console, dokumen baru muncul di `orders`
   dengan `uid` terisi (kalau sedang login) dan `total` yang benar.
4. Buka halaman **Profil** (klik nama kamu di pojok kanan atas) → order
   di atas harus muncul di Riwayat Transaksi.
5. Tandai order itu selesai — lewat email Verify (klik **Tandai Selesai** di
   email admin, lihat `apps-script/README.md`) **atau** manual di Firestore
   Console (ubah `status` jadi `"completed"`). Refresh halaman Profil → poin
   harus otomatis bertambah. Kalau pembeli (yang login) masih membuka halaman
   invoice, banner **✅ Done — Pesanan Selesai** muncul di situ otomatis tanpa
   perlu refresh (real-time via listener Firestore).
6. Klik "Konfirmasi ke Admin" pada invoice → harus membuka WhatsApp dengan
   pesan terisi.

## `tools/seed-once.html`
Sebaiknya dihapus dari hosting production setelah tidak diperlukan lagi
(bukan halaman untuk pengunjung biasa — cuma dipakai admin sekali di awal
atau saat update harga massal).

## Kalau nanti upgrade ke Blaze plan
`functions/index.js` sudah disiapkan (integrasi Xendit untuk pembayaran
otomatis + Digiflazz untuk top up otomatis ke akun game), tapi TIDAK aktif
sekarang. Untuk mengaktifkan: tambahkan kembali key `"functions"` di
`firebase.json`, isi `functions/.env` dengan API key Xendit & Digiflazz,
lalu `firebase deploy --only functions`.
