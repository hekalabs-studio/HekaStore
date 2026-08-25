# Email Verify Order — Backend Apps Script (GRATIS)

Backend gratis untuk mengirim **email verifikasi order** ke admin
(`hekoding@gmail.com`) dan tombol **Verify** yang menandai order `completed`.
Tidak butuh Blaze plan / Cloud Functions — tetap 100% di Spark plan.

Isi folder ini (`Code.gs`, `appsscript.json`) di-**paste** ke project Apps
Script baru di https://script.google.com (Apps Script tidak nge-deploy dari
repo ini; file di sini cuma sumber yang di-version-control).

## Cara kerja singkat
1. User checkout → order masuk Firestore (`status: pending_confirmation`) — tidak berubah.
2. Trigger waktu (tiap 1 menit) `notifyPendingOrders()` mencari order pending yang
   belum dinotifikasi → kirim email ke admin dengan tombol **Review & Verify**.
3. Admin buka link → halaman ringkasan order → klik **✅ Tandai Selesai**.
4. Order jadi `completed`. Saat pelanggan buka **Profil**, riwayat jadi "Selesai"
   dan poin loyalti otomatis masuk (mekanisme lama di `js/profile.js`).

> Link di email hanya **menampilkan** halaman (GET). Perubahan status terjadi
> lewat **tombol (POST)** — supaya scanner/anti-virus email yang suka "prefetch"
> link tidak menyelesaikan order tanpa sengaja.

## Setup (sekali saja, ~10 menit)

### 1. Pastikan akun Google punya akses ke project `hekaapedia`
Script harus dimiliki oleh akun Google yang **punya IAM role** di project
`hekaapedia` (idealnya `hekoding@gmail.com`). Cek:
[Google Cloud Console → IAM](https://console.cloud.google.com/iam-admin/iam?project=hekaapedia).
Akun tsb minimal harus punya role **Cloud Datastore User** (atau Owner/Editor).
Ini yang membuat token script boleh membaca/menulis Firestore (bypass rules).

### 2. Buat project Apps Script & paste kode
1. Buka https://script.google.com → **New project**.
2. Ganti isi file `Code.gs` dengan isi `apps-script/Code.gs` di repo ini.
3. Tampilkan manifest: ⚙️ **Project Settings** → centang
   **"Show 'appsscript.json' manifest file in editor"**.
4. Buka file `appsscript.json` yang muncul → ganti isinya dengan
   `apps-script/appsscript.json` di repo ini.

### 3. Set Script Properties
⚙️ **Project Settings** → **Script Properties** → **Add script property**:

| Property      | Value                          |
|---------------|--------------------------------|
| `PROJECT_ID`  | `hekaapedia`                   |
| `ADMIN_EMAIL` | `hekoding@gmail.com`           |
| `WEBAPP_URL`  | *(isi setelah langkah 4)*      |

### 4. Deploy sebagai Web app
1. **Deploy** → **New deployment** → ⚙️ pilih type **Web app**.
2. **Execute as:** `Me` — **Who has access:** `Anyone`.
3. Klik **Deploy** → **Authorize access** → login → setujui izin
   (Firestore, kirim email, akses jaringan).
4. Salin **Web app URL** (bentuknya `https://script.google.com/macros/s/XXXX/exec`).
5. Kembali ke **Script Properties**, isi `WEBAPP_URL` dengan URL tadi.

> Tiap kali kode diubah, buat **New deployment** (atau **Manage deployments →
> Edit → New version**) supaya versi live ikut update. URL `/exec` tetap sama
> kalau pakai "Manage deployments".

### 5. Pasang trigger waktu (kirim email otomatis)
1. Ikon ⏰ **Triggers** (panel kiri) → **Add Trigger**.
2. Function: **`notifyPendingOrders`** — Event source: **Time-driven** —
   Type: **Minutes timer** → **Every minute**.
3. Save (authorize lagi kalau diminta).

## Tes cepat
- Editor Apps Script → pilih fungsi **`testFirestore`** → **Run**. Lihat
  **Execution log**: harus muncul jumlah order pending (bukti koneksi Firestore OK).
- Pilih fungsi **`sendTestEmail`** → **Run** → cek inbox `hekoding@gmail.com`
  (email contoh; link Verify-nya sengaja tidak valid).
- Buat order asli di situs → dalam ≤1–2 menit email masuk dengan tombol
  **Review & Verify** → klik → **Tandai Selesai** → cek Firestore Console:
  `status` jadi `completed`. Buka Profil user → riwayat "Selesai" + poin bertambah.

## Keamanan
- Endpoint verify publik tapi dijaga **`verifyToken` acak (64 hex)** yang hanya
  ada di inbox admin + dokumen Firestore. `orderId` = ID acak Firestore.
- Verify menolak kalau status bukan `pending_confirmation` (anti dobel-proses).
- Guard `adminNotified` mencegah email dobel.
- Token IAM tidak pernah keluar ke browser — semua di sisi Apps Script.

## Kalau akun script BUKAN anggota project hekaapedia
Alternatif: pakai **service account key** (kamu sudah familiar — lihat
`DEPLOY.md` "Cara B"). Buat service account dengan role *Cloud Datastore User*,
generate JSON key, lalu ganti `ScriptApp.getOAuthToken()` di `Code.gs` dengan
token OAuth2 dari service account (mis. library `OAuth2` untuk Apps Script,
scope `https://www.googleapis.com/auth/datastore`). Untuk kebanyakan kasus,
langkah 1 (IAM ke akun pemilik script) jauh lebih sederhana dan tidak perlu ini.

## Batasan
- Order **custom nominal** tidak ditulis ke Firestore (dikonfirmasi manual via
  WhatsApp) → tidak ikut alur email ini. Sengaja, sesuai perilaku lama.
- Kuota email Gmail biasa: ~100 email/hari (cukup untuk toko kecil). Kalau
  order sangat banyak, pertimbangkan akun Workspace (~1.500/hari).
