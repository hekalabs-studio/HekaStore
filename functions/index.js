/**
 * functions/index.js
 *
 * Dua Cloud Functions:
 *
 * 1. createOrder (callable)
 *    Dipanggil dari js/checkout.js saat user klik "Lanjutkan Pembelian".
 *    Client HANYA mengirim productId + data pemesan (userId game, no WA,
 *    kode promo). Harga TIDAK pernah dipercaya dari client -> fungsi ini
 *    mengambil harga asli dari Firestore `products/{productId}`, menghitung
 *    total (termasuk aturan pembulatan utk Cash), lalu menyimpan dokumen
 *    baru di `orders` dan mengembalikan invoice resmi ke client.
 *    Ini menutup celah harga dimanipulasi lewat DevTools yang ada di versi lama.
 *
 * 2. onOrderCompleted (Firestore trigger)
 *    Saat admin mengubah status order jadi "completed" (lewat Firebase
 *    Console / admin panel di masa depan), fungsi ini otomatis menambah
 *    poin ke dokumen users/{uid} sesuai total belanja -> mengisi janji
 *    "Tukar Poin Pembelianmu" di banner index.html yang tadinya belum ada
 *    implementasinya sama sekali.
 *
 * DEPLOY:
 *   1. Project harus di Blaze plan (pay-as-you-go). Spark (gratis) tidak
 *      bisa deploy Cloud Functions.
 *   2. cd functions && npm install
 *   3. firebase deploy --only functions,firestore:rules,firestore:indexes
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const REGION = "asia-southeast2"; // Jakarta — samakan dgn js/firebase-init.js
setGlobalOptions({ region: REGION });

const POINTS_PER_RUPIAH = 1 / 10000; // 1 poin per Rp 10.000 belanja (bisa diubah)

function generateInvoiceId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HKA${rand}E`;
}

// Aturan pembulatan Cash: bulatkan ke atas ke kelipatan Rp 1.000 terdekat.
// (Versi lama punya 2 aturan pembulatan berbeda di 2 tempat kode yang
// saling kontradiksi — di sini disatukan jadi 1 aturan yang konsisten.)
function roundForCash(amount) {
  return Math.ceil(amount / 1000) * 1000;
}

exports.createOrder = onCall(async (request) => {
  const data = request.data || {};
  const { productId, category, paymentMethod, userId, zoneId, nowa, promoCode } = data;

  if (!productId || typeof productId !== "string") {
    throw new HttpsError("invalid-argument", "productId wajib diisi.");
  }
  if (!paymentMethod || !["Qris", "Cash"].includes(paymentMethod)) {
    throw new HttpsError("invalid-argument", "Metode pembayaran belum tersedia.");
  }
  if (!userId || String(userId).trim() === "") {
    throw new HttpsError("invalid-argument", "User ID wajib diisi.");
  }
  if (!nowa || !/^\d{10,15}$/.test(String(nowa))) {
    throw new HttpsError("invalid-argument", "Nomor WhatsApp tidak valid.");
  }

  // --- Ambil harga ASLI dari Firestore, bukan dari client ---
  const productSnap = await db.collection("products").doc(productId).get();
  if (!productSnap.exists) {
    throw new HttpsError("not-found", "Produk tidak ditemukan.");
  }
  const product = productSnap.data();
  if (product.active === false) {
    throw new HttpsError("failed-precondition", "Produk sedang tidak tersedia.");
  }
  if (category && product.category !== category) {
    // Jaga-jaga kalau productId dikirim dari halaman yang salah.
    throw new HttpsError("invalid-argument", "Produk tidak cocok dengan kategori halaman.");
  }

  let total = product.price;
  if (paymentMethod === "Cash") {
    total = roundForCash(total);
  }

  const invoiceId = generateInvoiceId();
  const orderRef = db.collection("orders").doc();

  await orderRef.set({
    invoiceId,
    productId,
    category: product.category,
    label: product.label,
    basePrice: product.price,
    total,
    paymentMethod,
    userId: String(userId),
    zoneId: zoneId ? String(zoneId) : null,
    nowa: String(nowa),
    promoCode: promoCode || null,
    uid: request.auth ? request.auth.uid : null, // null = tamu, tidak wajib login
    status: "pending_confirmation",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
  });

  return {
    orderId: orderRef.id,
    invoiceId,
    total,
    label: product.label,
  };
});

exports.onOrderCompleted = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (before.status === after.status) return; // tidak ada perubahan status
  if (after.status !== "completed") return;
  if (!after.uid) return; // order dari tamu (belum login) -> tidak ada poin

  const pointsEarned = Math.floor(after.total * POINTS_PER_RUPIAH);
  if (pointsEarned <= 0) return;

  const userRef = db.collection("users").doc(after.uid);
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) return;
    const current = userSnap.data().points || 0;
    tx.update(userRef, { points: current + pointsEarned });
  });
});
