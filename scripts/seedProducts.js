/**
 * scripts/seedProducts.js
 *
 * Alternatif seeding lewat terminal (kalau kamu punya Node.js + service
 * account key). Kalau tidak, pakai cara yang lebih mudah:
 * buka tools/seed-once.html di browser (lihat DEPLOY.md).
 *
 * Data produk diambil dari data/products-seed.mjs: SATU sumber yang sama
 * dipakai baik oleh script ini maupun tools/seed-once.html, supaya tidak
 * ada 2 salinan harga yang bisa berbeda.
 *
 * CARA PAKAI:
 *   1. Firebase Console > Project Settings > Service Accounts >
 *      Generate new private key -> simpan sebagai scripts/serviceAccountKey.json
 *   2. cd scripts && npm install firebase-admin
 *      (dependensi dipasang di folder scripts/ ini)
 *   3. Dari root folder: node scripts/seedProducts.js
 *
 * Aman dijalankan berkali-kali (pakai .set(merge), bukan menambah duplikat).
 */

const admin = require("firebase-admin");
// firebase-admin v14+: service Firestore dipindah ke entry point sendiri.
// Entry point ini juga tersedia di v12/v13, jadi aman untuk semua versi.
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const path = require("path");
const { pathToFileURL } = require("url");
const serviceAccount = require("./serviceAccountKey.json");

// Kompatibel firebase-admin v12/v13 (admin.credential.cert) dan v14+
// (cert diekspor langsung di top-level, admin.credential dihapus).
const credential = admin.credential
  ? admin.credential.cert(serviceAccount)
  : admin.cert(serviceAccount);

admin.initializeApp({
  credential,
});

const db = getFirestore();

async function main() {
  // Node (CommonJS) meng-import file ES module lewat dynamic import().
  const dataUrl = pathToFileURL(path.join(__dirname, "..", "data", "products-seed.mjs")).href;
  const { PRODUCTS } = await import(dataUrl);

  const counters = {};
  const seededIds = new Set();
  let batch = db.batch();
  let opCount = 0;
  let total = 0;

  for (const p of PRODUCTS) {
    const key = `${p.category}-${p.type}`;
    counters[key] = (counters[key] || 0) + 1;

    const slug = p.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const docId = `${p.category}-${p.type}-${slug}`.slice(0, 140);
    seededIds.add(docId);

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
        updatedAt: FieldValue.serverTimestamp(),
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

  // Sinkron penghapusan: produk yang masih ada di Firestore tapi sudah tidak
  // ada di data/products-seed.mjs (mis. paket yang dihapus dari daftar)
  // dinonaktifkan dengan active:false, bukan dihapus fisik, supaya riwayat
  // order lama yang menunjuk produk itu tetap valid.
  const existing = await db.collection("products").get();
  const stale = [];
  existing.forEach((d) => {
    if (!seededIds.has(d.id) && d.data().active !== false) stale.push(d);
  });
  if (stale.length > 0) {
    let staleBatch = db.batch();
    let staleCount = 0;
    for (const d of stale) {
      staleBatch.update(d.ref, {
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      staleCount++;
      if (staleCount >= 400) {
        await staleBatch.commit();
        staleBatch = db.batch();
        staleCount = 0;
      }
    }
    if (staleCount > 0) await staleBatch.commit();
    console.log(`Dinonaktifkan ${stale.length} produk lama yang sudah tidak ada di seed:`);
    stale.forEach((d) => console.log(`  - ${d.id} (${d.data().label})`));
  } else {
    console.log("Tidak ada produk lama yang perlu dinonaktifkan.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal seeding:", err);
  process.exit(1);
});
