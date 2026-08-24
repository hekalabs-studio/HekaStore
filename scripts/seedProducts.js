/**
 * scripts/seedProducts.js
 *
 * Alternatif seeding lewat terminal (kalau kamu punya Node.js + service
 * account key). Kalau tidak, pakai cara yang lebih mudah:
 * buka tools/seed-once.html di browser (lihat DEPLOY.md).
 *
 * Data produk diambil dari data/products-seed.mjs — SATU sumber yang sama
 * dipakai baik oleh script ini maupun tools/seed-once.html, supaya tidak
 * ada 2 salinan harga yang bisa berbeda.
 *
 * CARA PAKAI:
 *   1. Firebase Console > Project Settings > Service Accounts >
 *      Generate new private key -> simpan sebagai scripts/serviceAccountKey.json
 *   2. npm install firebase-admin --save-dev   (dijalankan di root folder)
 *   3. node scripts/seedProducts.js
 *
 * Aman dijalankan berkali-kali (pakai .set(merge), bukan menambah duplikat).
 */

const admin = require("firebase-admin");
const path = require("path");
const { pathToFileURL } = require("url");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  // Node (CommonJS) meng-import file ES module lewat dynamic import().
  const dataUrl = pathToFileURL(path.join(__dirname, "..", "data", "products-seed.mjs")).href;
  const { PRODUCTS } = await import(dataUrl);

  const counters = {};
  let batch = db.batch();
  let opCount = 0;
  let total = 0;

  for (const p of PRODUCTS) {
    const key = `${p.category}-${p.type}`;
    counters[key] = (counters[key] || 0) + 1;

    const slug = p.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const docId = `${p.category}-${p.type}-${slug}`.slice(0, 140);

    batch.set(
      db.collection("products").doc(docId),
      {
        category: p.category,
        type: p.type,
        label: p.label,
        price: p.price,
        tag: p.tag || null,
        order: counters[key],
        active: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    opCount++;
    total++;

    if (opCount >= 400) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }
  if (opCount > 0) await batch.commit();

  console.log(`Selesai. ${total} produk ditulis ke koleksi 'products'.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal seeding:", err);
  process.exit(1);
});
