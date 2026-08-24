/**
 * functions/index.js
 *
 * ⚠️ TIDAK AKTIF SELAMA PROJECT MASIH DI SPARK PLAN (GRATIS).
 * Cloud Functions (semua isi file ini) butuh Blaze plan untuk bisa
 * di-deploy. Selama masih Spark, folder ini TIDAK ikut di-deploy — lihat
 * firebase.json (tidak ada key "functions" di sana secara sengaja).
 * Situs saat ini berjalan tanpa file ini sama sekali: order dibuat
 * langsung dari browser + divalidasi oleh firestore.rules (lihat
 * js/checkout.js dan firestore.rules).
 *
 * File ini disimpan sebagai referensi/rencana ke depan kalau nanti upgrade
 * ke Blaze plan — isinya pembayaran otomatis via Xendit + top up otomatis
 * via Digiflazz. Untuk mengaktifkan nanti: tambahkan kembali key
 * "functions" di firebase.json, isi functions/.env dengan API key Xendit
 * & Digiflazz, lalu firebase deploy --only functions.
 *
 * Fitur (kalau nanti diaktifkan):
 * 1. createPaymentOrder (callable) - buat order + payment link otomatis via Xendit
 * 2. paymentWebhook (HTTP) - terima notifikasi pembayaran dari Xendit
 * 3. processTopupForOrder - panggil Digiflazz untuk kirim ke akun game
 * 4. onOrderCompleted - tambah poin user saat order completed
 *
 * ENV vars yang dibutuhkan (di .env, JANGAN commit):
 *   XENDIT_API_KEY=...
 *   XENDIT_WEBHOOK_TOKEN=...
 *   DIGIFLAZZ_USERNAME=...
 *   DIGIFLAZZ_API_KEY=...
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

const REGION = "asia-southeast2";
setGlobalOptions({ region: REGION });

const POINTS_PER_RUPIAH = 1 / 10000;

function generateInvoiceId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HKA${rand}E`;
}

function generateOrderRefId() {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function roundForCash(amount) {
  return Math.ceil(amount / 1000) * 1000;
}

async function getProduct(productId, expectedCategory) {
  const snap = await db.collection("products").doc(productId).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "Produk tidak ditemukan.");
  }
  const product = snap.data();
  if (product.active === false) {
    throw new HttpsError("failed-precondition", "Produk sedang tidak tersedia.");
  }
  if (expectedCategory && product.category !== expectedCategory) {
    throw new HttpsError("invalid-argument", "Produk tidak cocok dengan kategori halaman.");
  }
  return product;
}

async function updateOrderStatus(orderId, status, extra = {}) {
  const ref = db.collection("orders").doc(orderId);
  await ref.update({
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...extra,
  });
  return ref;
}

// ========================
// 1. createPaymentOrder
// ========================
exports.createPaymentOrder = onCall(async (request) => {
  const data = request.data || {};
  const { productId, category, paymentMethod, userId, zoneId, nowa, promoCode, serviceName } = data;

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

  const product = await getProduct(productId, category);
  let total = product.price;
  if (paymentMethod === "Cash") {
    total = roundForCash(total);
  }

  const invoiceId = generateInvoiceId();
  const orderRef = db.collection("orders").doc();
  const orderId = orderRef.id;
  const uid = request.auth ? request.auth.uid : null;

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
    uid,
    status: "pending_payment",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
    serviceName: serviceName || "Top Up",
  });

  if (paymentMethod === "Cash") {
    return {
      orderId,
      invoiceId,
      total,
      label: product.label,
      paymentUrl: null,
      status: "pending_confirmation",
    };
  }

  try {
    const xenditKey = process.env.XENDIT_API_KEY;
    if (!xenditKey) {
      throw new Error("XENDIT_API_KEY belum di-set.");
    }

    const externalId = `heka-${orderId}`;
    const description = `${product.label} - ${serviceName || "Top Up"} (${invoiceId})`;
    const successRedirect = `https://hekaapedia.web.app/profile.html?order=${invoiceId}`;
    const failureRedirect = `https://hekaapedia.web.app/?order=failed-${invoiceId}`;

    const res = await fetch("https://api.xendit.co/invoices", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + Buffer.from(xenditKey + ":").toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        external_id: externalId,
        amount: total,
        description,
        currency: "IDR",
        invoice_duration: 3600,
        success_redirect_url: successRedirect,
        failure_redirect_url: failureRedirect,
        webhook_url: `https://asia-southeast2-hekaapedia.cloudfunctions.net/paymentWebhook`,
        metadata: { orderId, invoiceId, productId, userId, zoneId: zoneId || null, nowa: String(nowa), serviceName: serviceName || "Top Up" },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Xendit error:", res.status, text);
      return { orderId, invoiceId, total, label: product.label, paymentUrl: null };
    }

    const invoice = await res.json();
    const paymentUrl = invoice.invoice_url || invoice.payment_url || null;
    if (paymentUrl) {
      await updateOrderStatus(orderId, "pending_payment", { paymentReference: invoice.id });
    }

    return { orderId, invoiceId, total, label: product.label, paymentUrl };
  } catch (err) {
    console.error("createPaymentOrder Xendit gagal:", err);
    return { orderId, invoiceId, total, label: product.label, paymentUrl: null };
  }
});

// ========================
// 2. paymentWebhook
// ========================
exports.paymentWebhook = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const event = req.body || {};
  const status = event.status || event.event;
  const invoiceIdFromMeta = event.metadata?.invoiceId;
  const orderIdFromMeta = event.metadata?.orderId;

  if (!invoiceIdFromMeta && !orderIdFromMeta) {
    return res.status(400).send("Missing metadata");
  }

  let orderRef = null;
  if (orderIdFromMeta) {
    orderRef = db.collection("orders").doc(orderIdFromMeta);
  } else {
    const snap = await db.collection("orders").where("invoiceId", "==", invoiceIdFromMeta).limit(1).get();
    if (snap.empty) return res.status(404).send("Order not found");
    orderRef = snap.docs[0].ref;
  }

  const snap = await orderRef.get();
  if (!snap.exists) return res.status(404).send("Order not found");

  if (status === "PAID") {
    await updateOrderStatus(orderRef.id, "paid", { paidAt: admin.firestore.FieldValue.serverTimestamp(), paymentReference: event.id || event.invoice_id || null });
    await processTopupForOrder(orderRef.id);
  } else if (["EXPIRED", "FAILED"].includes(status)) {
    await updateOrderStatus(orderRef.id, status.toLowerCase());
  }

  return res.status(200).send("OK");
});

// ========================
// 3. processTopupForOrder
// ========================
async function processTopupForOrder(orderId) {
  const snap = await db.collection("orders").doc(orderId).get();
  if (!snap.exists) return;
  const order = snap.data();
  if (order.status !== "paid") return;

  await updateOrderStatus(orderId, "processing");

  try {
    const result = await callDigiflazz(order);
    if (result && result.status === "Sukses") {
      await updateOrderStatus(orderId, "completed", {
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        gameReference: result.ref_id || result.tr_id || null,
        gameMessage: result.message || "Top up berhasil",
      });
    } else {
      await updateOrderStatus(orderId, "failed", {
        gameReference: result ? result.ref_id : null,
        gameMessage: result ? result.message : "Gagal memproses top up",
      });
    }
  } catch (err) {
    console.error("processTopup gagal:", err);
    await updateOrderStatus(orderId, "failed", { gameMessage: err.message || "Terjadi kesalahan saat top up" });
  }
}

async function callDigiflazz(order) {
  const username = process.env.DIGIFLAZZ_USERNAME;
  const apiKey = process.env.DIGIFLAZZ_API_KEY;
  if (!username || !apiKey) {
    throw new Error("DIGIFLAZZ_USERNAME / DIGIFLAZZ_API_KEY belum di-set.");
  }

  const productCode = order.productId;
  const refId = generateOrderRefId();
  const payload = {
    username,
    apiKey,
    destination: order.userId,
    product_code: productCode,
    ref_id: refId,
    amount: order.total,
  };

  const res = await fetch("https://api.digiflazz.com/v1/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    data = { data: { message: text || "Gagal parse respon Digiflazz", status: "Gagal" } };
  }

  const message = data?.data?.message || data?.message || "Tidak ada pesan";
  const status = (data?.data?.status || data?.status || "Gagal").toString();
  return { ref_id: refId, message, status, raw: data };
}

// ========================
// 4. onOrderCompleted - poin loyalitas
// ========================
exports.onOrderCompleted = onDocumentUpdated("orders/{orderId}", async (event) => {
  const before = event.data.before.data();
  const after = event.data.after.data();

  if (before.status === after.status) return;
  if (after.status !== "completed") return;
  if (!after.uid) return;

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
