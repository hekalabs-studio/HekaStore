# Hekaapedia

Website top up game, pulsa, token listrik, dan layanan digital lainnya dengan login/daftar, profil user, dan riwayat transaksi.

## Fitur Utama
- Auth: Login / Daftar dengan email + password (Firebase Auth)
- Multi kategori: game, pulsa, token listrik, voucher, dll
- Produk: harga dikelola via Firestore (admin ubah harga tanpa deploy ulang)
- Checkout: pilih nominal, metode, lanjutkan
- Pembayaran manual: QRIS statis + konfirmasi WhatsApp
- Top up diproses manual oleh admin
- Profil user: poin loyalitas + riwayat order
- Banner slider otomatis dengan animasi fade

## Struktur Kategori Produk
Setiap produk di Firestore `products` wajib punya field `category` dan `type`.
Contoh kategori yang sudah ada:
- `freefire`, `mobilelegend`, `roblox` (game)
- `pulsatelkomsel`, `pulsaindosat`, `pulsaxl`, `pulsatri` (pulsa)
- `tokenlistrik` (token listrik)

Untuk kategori baru, cukup tambahkan data produk dengan `category` yang baru.

## Setup (Spark Plan - Gratis)

### 1. Firebase
- Pastikan project Firebase sudah aktif.
- Aktifkan: Auth (email/password), Firestore, Hosting.
- Bisa menggunakan Spark plan (gratis).

### 2. Firestore Rules
Deploy rules:
```
firebase deploy --only firestore:rules
```

### 3. Seed Produk
Isi koleksi `products` di Firestore menggunakan:
- `tools/seed-once.html` (dari browser), atau
- `scripts/seedProducts.js` (dari terminal).

### 4. Hosting
```
firebase deploy --only hosting
```

## Menambah / Mengubah Banner
Banner slider mengambil data dari array `banners` di `js/main.js`. Banner
memakai gradient CSS + emoji (bukan file gambar), supaya tidak tergantung
aset gambar yang mungkin belum di-upload ke folder `img/banner/`.

Contoh menambah banner:
```javascript
const banners = [
  {
    gradient: "linear-gradient(135deg, #0c937b 0%, #0eb193 45%, #2ed9b3 100%)",
    icon: "🎮",
    title: "Judul Banner",
    subtitle: "Deskripsi singkat promomu.",
    btnText: "Tombol",
    btnLink: "#listJudul",
  },
  // tambahkan banner lain di sini
];
```
Kalau nanti mau pakai gambar asli, tinggal ganti baris
`style="background: ${b.gradient}"` di `js/main.js` (fungsi `initBannerSlider`)
jadi `style="background-image: url('${b.img}')"` seperti sebelumnya, dan
upload gambarnya ke `img/banner/`.

Slide berganti otomatis tiap 5 detik dengan animasi fade. User juga bisa
navigasi dengan panah kiri/kanan atau dot di bawah banner.

## Catatan
- Mode ini 100% jalan di Spark plan (tanpa Cloud Functions sama sekali).
- Order ditulis langsung dari browser ke Firestore, divalidasi oleh
  `firestore.rules` (harga selalu dicocokkan ke dokumen produk asli).
- Poin loyalitas JALAN di Spark plan — tidak pakai counter yang di-increment,
  tapi 1 dokumen klaim per order `completed` di `users/{uid}/pointClaims`,
  yang nilainya divalidasi rules langsung dari `order.total`. Lihat
  `js/profile.js` dan bagian `pointClaims` di `firestore.rules`.
- Pembayaran menggunakan QRIS statis. User bayar manual lalu konfirmasi via WhatsApp.
- Setiap order baru mengirim **email verifikasi ke admin** (`hekoding@gmail.com`)
  dengan tombol **Verify**. Admin klik Verify (setelah item game masuk) → order
  `completed` → riwayat user jadi "Selesai" + poin masuk otomatis. Backend-nya
  Google Apps Script (gratis, tanpa Blaze) — setup di `apps-script/README.md`.
  Menandai `completed` juga tetap bisa manual lewat Firebase Console.
- Alur ini berlaku untuk **semua halaman produk** (game, pulsa, token listrik,
  dst) — backend meng-query order berdasarkan `status`, bukan kategori, jadi
  tidak ada yang khusus Free Fire/Mobile Legends saja.
- Halaman pembayaran menampilkan **banner status real-time**: selama menunggu
  tampil "⏳ Menunggu verifikasi admin", dan berubah otomatis jadi
  "✅ Done — Pesanan Selesai" begitu admin klik Verify (tanpa refresh). Ini
  hanya untuk pembeli yang **login** (aturan Firestore cuma mengizinkan pemilik
  order membaca dokumennya); pembeli tamu tidak melihat banner ini.
- `functions/index.js` (integrasi Xendit + Digiflazz untuk pembayaran &
  top up otomatis) TIDAK aktif selama Spark plan — disimpan sebagai
  referensi kalau nanti upgrade ke Blaze plan.
