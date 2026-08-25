/**
 * Hekaapedia — Email Verify Order (Google Apps Script)
 * =====================================================
 * Backend GRATIS (tanpa Blaze / tanpa Cloud Functions) untuk fitur:
 *   1) Kirim email ke admin (hekoding@gmail.com) tiap ada order baru.
 *   2) Tombol "Verify" di halaman review -> tandai order `completed`
 *      -> otomatis tampil "Selesai" di Riwayat Transaksi user + poin masuk
 *         (mekanisme autoClaimPoints di js/profile.js yang sudah ada).
 *
 * Cara kerja akses Firestore:
 *   Script ini memanggil Firestore REST API pakai `ScriptApp.getOAuthToken()`.
 *   Selama akun Google pemilik script ini punya IAM role di project
 *   `hekaapedia` (Owner/Editor atau minimal "Cloud Datastore User"), token
 *   itu MEM-BYPASS security rules (lihat dokumentasi Firestore REST). Jadi
 *   script boleh membaca semua order pending & mengubah statusnya TANPA
 *   perlu menyentuh firestore.rules sama sekali.
 *
 * Setup: lihat apps-script/README.md. Ringkas:
 *   - Script Properties: PROJECT_ID, ADMIN_EMAIL, WEBAPP_URL
 *   - Deploy sebagai Web app (Execute as: Me, Access: Anyone)
 *   - Trigger waktu: notifyPendingOrders, tiap 1 menit
 */

/* =========================================================================
 * KONFIGURASI (dari Script Properties, dengan default aman)
 * ========================================================================= */
function prop_(key, dflt) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  return (v == null || v === '') ? (dflt || '') : v;
}
function projectId_() { return prop_('PROJECT_ID', 'hekaapedia'); }
function adminEmail_() { return prop_('ADMIN_EMAIL', 'hekoding@gmail.com'); }
function webappUrl_() { return prop_('WEBAPP_URL', ScriptApp.getService().getUrl()); }

var STATUS_PENDING = 'pending_confirmation';

/* =========================================================================
 * 1) TRIGGER: kirim email untuk tiap order pending yang belum dinotifikasi
 *    Pasang trigger waktu (Time-driven, tiap menit) ke fungsi ini.
 * ========================================================================= */
function notifyPendingOrders() {
  var orders = fsQuery_('orders', 'status', STATUS_PENDING, 50);
  var sent = 0;
  for (var i = 0; i < orders.length; i++) {
    var o = orders[i];
    if (o.data.adminNotified === true) continue; // sudah pernah dikirim
    try {
      // Tandai + simpan token DULU supaya kalau trigger jalan lagi tidak
      // mengirim email dobel (guard idempoten).
      var token = makeToken_();
      fsPatch_('orders/' + o.id, {
        adminNotified: { booleanValue: true },
        verifyToken: { stringValue: token },
        notifiedAt: { timestampValue: nowIso_() }
      }, ['adminNotified', 'verifyToken', 'notifiedAt']);

      sendAdminEmail_(o, token);
      sent++;
    } catch (err) {
      console.error('Gagal memproses order ' + o.id + ': ' + (err && err.message ? err.message : err));
    }
  }
  console.log('notifyPendingOrders selesai. Email terkirim: ' + sent);
  return sent;
}

/* =========================================================================
 * 2) doGet: halaman "Review & Verify" (dibuka dari link di email)
 *    GET ini HANYA MENAMPILKAN halaman — tidak mengubah data — supaya
 *    scanner/anti-virus email yang suka "prefetch" link tidak menyelesaikan
 *    order tanpa sengaja. Perubahan status terjadi lewat doPost (tombol).
 * ========================================================================= */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action === 'review' && p.orderId && p.token) {
    return renderReview_(p.orderId, p.token);
  }
  return htmlPage_('Hekaapedia Admin',
    '<p>Halaman verifikasi order. Buka lewat link di email yang dikirim ke admin.</p>');
}

/* =========================================================================
 * 3) doPost: eksekusi keputusan admin (Selesai / Gagal)
 * ========================================================================= */
function doPost(e) {
  var p = (e && e.parameter) || {};
  var orderId = p.orderId, token = p.token, decision = p.decision;
  if (!orderId || !token || !decision) {
    return htmlPage_('Parameter kurang', '<p style="color:#e63946;">Data tidak lengkap.</p>');
  }

  var order = fsGet_('orders/' + orderId);
  if (!order) return htmlPage_('Order tidak ditemukan', '<p>Order tidak ada / sudah dihapus.</p>');

  var d = order.data;
  if (d.verifyToken !== token) {
    return htmlPage_('Ditolak', '<p style="color:#e63946;">Token verifikasi tidak valid. Gunakan link terbaru dari email.</p>');
  }
  if (d.status !== STATUS_PENDING) {
    return htmlPage_('Sudah diproses',
      orderDetailsHtml_(d) + '<p>Order ini sudah berstatus <b>' + esc_(d.status) + '</b>, tidak diubah lagi.</p>');
  }

  var newStatus, fields = {}, mask = ['status'];
  if (decision === 'complete') {
    newStatus = 'completed';
    fields.status = { stringValue: 'completed' };
    fields.completedAt = { timestampValue: nowIso_() };
    mask.push('completedAt');
  } else if (decision === 'fail') {
    newStatus = 'failed';
    fields.status = { stringValue: 'failed' };
  } else {
    return htmlPage_('Pilihan tidak dikenal', '<p>Aksi tidak valid.</p>');
  }

  fsPatch_('orders/' + orderId, fields, mask);
  d.status = newStatus; // untuk ditampilkan di halaman hasil

  var msg = (newStatus === 'completed')
    ? '<p style="color:#0eb193;font-weight:800;font-size:16px;">✅ Order ditandai SELESAI.</p>'
      + '<p style="color:#555;">Riwayat transaksi pelanggan otomatis menjadi "Selesai" dan poin loyalti masuk saat mereka membuka halaman Profil.</p>'
    : '<p style="color:#e63946;font-weight:800;font-size:16px;">❌ Order ditandai GAGAL.</p>';

  return htmlPage_('Verifikasi selesai', msg + orderDetailsHtml_(d));
}

/* =========================================================================
 * Render halaman review + tombol
 * ========================================================================= */
function renderReview_(orderId, token) {
  var order = fsGet_('orders/' + orderId);
  if (!order) return htmlPage_('Order tidak ditemukan', '<p>Order dengan ID tersebut tidak ada.</p>');

  var d = order.data;
  if (d.verifyToken !== token) {
    return htmlPage_('Link tidak valid', '<p style="color:#e63946;">Token verifikasi tidak cocok. Gunakan link terbaru dari email.</p>');
  }

  var details = orderDetailsHtml_(d);
  if (d.status === 'completed') {
    return htmlPage_('Sudah Selesai', details + '<p style="color:#0eb193;font-weight:700;">✅ Order ini sudah ditandai SELESAI.</p>');
  }
  if (d.status === 'failed') {
    return htmlPage_('Sudah Gagal', details + '<p style="color:#e63946;font-weight:700;">❌ Order ini sudah ditandai GAGAL.</p>');
  }
  if (d.status !== STATUS_PENDING) {
    return htmlPage_('Status: ' + esc_(d.status), details + '<p>Order tidak dalam status menunggu konfirmasi.</p>');
  }

  var action = webappUrl_();
  var form = ''
    + '<form method="post" action="' + esc_(action) + '" target="_top" style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap;">'
    + '<input type="hidden" name="orderId" value="' + esc_(orderId) + '">'
    + '<input type="hidden" name="token" value="' + esc_(token) + '">'
    + '<button type="submit" name="decision" value="complete" style="flex:1;min-width:150px;padding:13px 16px;border:none;border-radius:10px;background:linear-gradient(0deg,#0eb193,#2ed9b3);color:#fff;font-weight:800;font-size:15px;cursor:pointer;">✅ Tandai Selesai</button>'
    + '<button type="submit" name="decision" value="fail" style="flex:1;min-width:150px;padding:13px 16px;border:none;border-radius:10px;background:#e63946;color:#fff;font-weight:800;font-size:15px;cursor:pointer;">❌ Tandai Gagal</button>'
    + '</form>'
    + '<p style="color:#888;font-size:12px;margin-top:14px;">Klik "Tandai Selesai" setelah item game sudah masuk / pelanggan sudah dilayani.</p>';

  return htmlPage_('Verifikasi Order ' + esc_(d.invoiceId || ''), details + form);
}

/* =========================================================================
 * Email ke admin
 * ========================================================================= */
function sendAdminEmail_(order, token) {
  var d = order.data;
  var url = webappUrl_() + '?action=review&orderId=' + encodeURIComponent(order.id) + '&token=' + encodeURIComponent(token);

  var html = ''
    + '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#222;">'
    + '<h2 style="color:#0eb193;margin:0 0 2px;">Hekaapedia</h2>'
    + '<p style="margin:0 0 16px;color:#555;">Ada order baru yang menunggu konfirmasi. Setelah item game sudah masuk / pelanggan sudah dilayani, klik tombol di bawah untuk memverifikasi.</p>'
    + orderDetailsHtml_(d)
    + '<div style="text-align:center;">'
    + '<a href="' + esc_(url) + '" style="display:inline-block;margin-top:20px;padding:13px 26px;background:#0eb193;color:#fff;text-decoration:none;border-radius:10px;font-weight:800;">Review &amp; Verify Order &rarr;</a>'
    + '</div>'
    + '<p style="color:#888;font-size:12px;margin-top:18px;">Kalau tombol tidak bisa diklik, salin link ini:<br>' + esc_(url) + '</p>'
    + '</div>';

  MailApp.sendEmail({
    to: adminEmail_(),
    subject: 'Order baru ' + (d.invoiceId || order.id) + ' — perlu verifikasi (' + formatRupiah_(d.total) + ')',
    htmlBody: html,
    name: 'Hekaapedia Order Bot'
  });
}

function orderDetailsHtml_(d) {
  var rows = [
    ['Invoice', d.invoiceId],
    ['Produk', d.label],
    ['Kategori', d.category],
    ['Total', formatRupiah_(d.total)],
    ['Metode', d.paymentMethod],
    ['User ID', (d.userId || '') + (d.zoneId ? ' (' + d.zoneId + ')' : '')],
    ['No. WhatsApp', d.nowa],
    ['Kode Promo', d.promoCode || '-'],
    ['Akun', d.uid ? 'Terdaftar' : 'Tamu (tanpa akun)'],
    ['Waktu', formatDate_(d.createdAt)],
    ['Status', d.status]
  ];
  var tr = '';
  for (var i = 0; i < rows.length; i++) {
    tr += '<tr>'
      + '<td style="padding:7px 10px;color:#666;border-bottom:1px solid #eee;white-space:nowrap;vertical-align:top;">' + esc_(rows[i][0]) + '</td>'
      + '<td style="padding:7px 10px;font-weight:600;border-bottom:1px solid #eee;">' + esc_(rows[i][1]) + '</td>'
      + '</tr>';
  }
  return '<table style="width:100%;border-collapse:collapse;font-size:14px;">' + tr + '</table>';
}

/* =========================================================================
 * Firestore REST helpers (bypass rules via IAM token)
 * ========================================================================= */
function fsBase_() {
  return 'https://firestore.googleapis.com/v1/projects/' + projectId_() + '/databases/(default)/documents';
}

function fsFetch_(suffix, method, body) {
  var opts = {
    method: method,
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
  };
  if (body) opts.payload = JSON.stringify(body);
  return UrlFetchApp.fetch(fsBase_() + suffix, opts);
}

// Query 1 field equality (single-field, tidak butuh composite index).
function fsQuery_(collectionId, field, value, limit) {
  var body = {
    structuredQuery: {
      from: [{ collectionId: collectionId }],
      where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
      limit: limit || 50
    }
  };
  var res = fsFetch_(':runQuery', 'post', body);
  if (res.getResponseCode() >= 300) {
    throw new Error('runQuery gagal (' + res.getResponseCode() + '): ' + res.getContentText());
  }
  var arr = JSON.parse(res.getContentText());
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var row = arr[i];
    if (!row.document) continue; // baris readTime tanpa dokumen -> skip
    out.push({ id: docId_(row.document.name), data: parseFields_(row.document.fields || {}) });
  }
  return out;
}

function fsGet_(path) {
  var res = fsFetch_('/' + path, 'get', null);
  if (res.getResponseCode() === 404) return null;
  if (res.getResponseCode() >= 300) {
    throw new Error('GET gagal (' + res.getResponseCode() + '): ' + res.getContentText());
  }
  var doc = JSON.parse(res.getContentText());
  if (!doc.fields) return null;
  return { id: docId_(doc.name), data: parseFields_(doc.fields) };
}

// PATCH hanya field di `mask` (updateMask) -> field lain di dokumen aman.
function fsPatch_(path, fields, mask) {
  var qs = mask.map(function (m) { return 'updateMask.fieldPaths=' + encodeURIComponent(m); }).join('&');
  var res = fsFetch_('/' + path + '?' + qs, 'patch', { fields: fields });
  if (res.getResponseCode() >= 300) {
    throw new Error('PATCH gagal (' + res.getResponseCode() + '): ' + res.getContentText());
  }
  return JSON.parse(res.getContentText());
}

function parseFields_(fields) {
  var out = {};
  for (var k in fields) {
    if (Object.prototype.hasOwnProperty.call(fields, k)) out[k] = fromFsValue_(fields[k]);
  }
  return out;
}

function fromFsValue_(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return new Date(v.timestampValue);
  if ('nullValue' in v) return null;
  return null; // map/array tidak dipakai di koleksi orders
}

function docId_(name) { return String(name).split('/').pop(); }

/* =========================================================================
 * Util kecil
 * ========================================================================= */
function makeToken_() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function nowIso_() { return new Date().toISOString(); }

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRupiah_(num) {
  var n = Number(num);
  if (!isFinite(n)) return '-';
  return 'Rp ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatDate_(d) {
  if (!(d instanceof Date) || isNaN(d.getTime())) return '-';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
}

function htmlPage_(title, bodyHtml) {
  var html = '<!doctype html><html><head><meta charset="utf-8">'
    + '<meta name="viewport" content="width=device-width, initial-scale=1">'
    + '<title>' + esc_(title) + '</title></head>'
    + '<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f7f6;margin:0;padding:24px;">'
    + '<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.08);padding:24px;">'
    + '<h2 style="margin:0 0 4px;color:#0eb193;">Hekaapedia</h2>'
    + '<h3 style="margin:0 0 16px;">' + esc_(title) + '</h3>'
    + bodyHtml
    + '</div></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle(title)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* =========================================================================
 * Bantuan verifikasi (jalankan manual dari editor Apps Script)
 * ========================================================================= */
// Kirim 1 email contoh ke ADMIN_EMAIL untuk memastikan konfigurasi email OK.
function sendTestEmail() {
  var fake = {
    id: 'CONTOH123',
    data: {
      invoiceId: 'HKA0000E', label: '100 Diamond', category: 'freefire', total: 15000,
      paymentMethod: 'Qris', userId: '123456789', zoneId: null, nowa: '6281234567890',
      promoCode: null, uid: 'demo', createdAt: new Date(), status: STATUS_PENDING
    }
  };
  sendAdminEmail_(fake, 'TOKEN-CONTOH-TIDAK-VALID');
  console.log('Email contoh dikirim ke ' + adminEmail_() + ' (link Verify sengaja tidak valid).');
}

// Cek koneksi Firestore + hitung order pending saat ini.
function testFirestore() {
  var pending = fsQuery_('orders', 'status', STATUS_PENDING, 50);
  console.log('Order pending: ' + pending.length + (pending.length ? ' (belum dinotifikasi: '
    + pending.filter(function (o) { return o.data.adminNotified !== true; }).length + ')' : ''));
  return pending.length;
}

// Diagnostik scope: log scope yang sedang dimiliki token.
// HARUS memuat ".../auth/datastore". Kalau tidak ada -> manifest belum aktif
// atau script belum di-otorisasi ulang setelah scope ditambahkan (lihat di
// bawah). Ini penyebab error 403 "insufficient authentication scopes".
function checkScopes() {
  var token = ScriptApp.getOAuthToken();
  var res = UrlFetchApp.fetch(
    'https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true }
  );
  var info = {};
  try { info = JSON.parse(res.getContentText()); } catch (e) {}
  var scopes = (info.scope || '').split(' ');
  console.log('Scope aktif:\n- ' + scopes.join('\n- '));
  console.log(scopes.indexOf('https://www.googleapis.com/auth/datastore') >= 0
    ? '✅ Scope datastore ADA — Firestore harusnya bisa diakses.'
    : '❌ Scope datastore TIDAK ADA — otorisasi ulang script (lihat README).');
}

