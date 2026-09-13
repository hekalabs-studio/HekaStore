/**
 * scripts/clean-firestore-dashes.js
 * =================================
 * Sekali jalan untuk membuang tanda garis panjang (em dash U+2014, en dash
 * U+2013, minus U+2212, dsb.) dari data produk & order yang SUDAH tersimpan di
 * Firestore. File sumber situs sudah bersih, tapi baris lama di database masih
 * bisa menampilkannya di kartu produk / riwayat transaksi.
 *
 * Aman: hanya menyentuh field teks yang ditentukan di FIELD allowlist. ID,
 * token, invoice, email, nomor WA, dan status TIDAK pernah diubah.
 *
 * Cara pakai (sama seperti seedProducts.js):
 *   cd scripts && npm install firebase-admin
 *   node scripts/clean-firestore-dashes.js            -> dry-run, hanya lapor
 *   node scripts/clean-firestore-dashes.js --write     -> benar-benar menulis
 *
 * Butuh scripts/serviceAccountKey.json (Firebase Console > Project Settings >
 * Service Accounts). Jangan pernah commit file key tersebut.
 */
const admin = require("firebase-admin");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));
const credential = admin.credential
  ? admin.credential.cert(serviceAccount)
  : admin.cert(serviceAccount);
admin.initializeApp({ credential });

const db = getFirestore();
const WRITE = process.argv.includes("--write");

/* Field yang boleh disentuh per koleksi (allowlist, bukan semua field). */
const TARGETS = {
  products: ["label", "tag"],
  orders: ["label", "category", "paymentMethod", "serviceName", "note", "description"],
};

/* Aturan sama dengan js/dash-guard.js: hyphen ASCII "-" dibiarkan. */
const DASH_RUNS = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g;

function noDash(value) {
  const str = String(value == null ? "" : value);
  DASH_RUNS.lastIndex = 0;
  if (!DASH_RUNS.test(str)) return str;
  const chunks = str.split(DASH_RUNS);
  let out = chunks[0];
  for (let i = 1; i < chunks.length; i++) {
    const left = out;
    const right = chunks[i];
    const lt = left.replace(/\s+$/, "");
    const rt = right.replace(/^\s+/, "");
    let rep;
    if (lt === "" || rt === "") rep = "";
    else if (/\d$/.test(lt) && /^\d/.test(rt)) rep = " s/d ";
    else if (/^rp[\s.\d]/i.test(rt) && /(\d|rb|jt|ribu|juta|miliar)$/i.test(lt)) rep = " s/d ";
    else if (/\s$/.test(left) && /^\s/.test(right)) rep = ", ";
    else rep = /\s$/.test(left) || /^\s/.test(right) ? " " : ", ";
    out += rep + right;
  }
  return out.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+([,.;:!])/g, "$1");
}

async function cleanCollection(name) {
  const fields = TARGETS[name];
  const snap = await db.collection(name).get();
  let batch = db.batch();
  let pending = 0;
  let changed = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data() || {};
    const patch = {};
    for (const f of fields) {
      const oldVal = data[f];
      if (typeof oldVal !== "string" || !oldVal) continue;
      const newVal = noDash(oldVal);
      if (newVal !== oldVal) {
        patch[f] = newVal;
        console.log(`  ${docSnap.id} :: ${f}`);
        console.log(`     sebelum : ${JSON.stringify(oldVal)}`);
        console.log(`     sesudah : ${JSON.stringify(newVal)}`);
      }
    }
    if (Object.keys(patch).length) {
      changed++;
      if (WRITE) {
        patch.updatedAt = FieldValue.serverTimestamp();
        batch.update(docSnap.ref, patch);
        if (++pending >= 400) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
    }
  }

  if (WRITE && pending > 0) await batch.commit();
  console.log(`Koleksi '${name}': ${snap.size} dokumen diperiksa, ${changed} perlu dibersihkan.`);
  return changed;
}

async function main() {
  console.log(WRITE ? "MODE TULIS: data akan diubah." : "MODE DRY-RUN: tidak ada yang diubah (tambahkan --write).");
  let total = 0;
  for (const name of Object.keys(TARGETS)) {
    console.log(`\n>>> ${name}`);
    total += await cleanCollection(name);
  }
  console.log(`\nSelesai. Total ${total} dokumen ${WRITE ? "dibersihkan" : "terdeteksi perlu dibersihkan"}.`);
  if (!WRITE && total > 0) console.log("Jalankan ulang dengan: node scripts/clean-firestore-dashes.js --write");
  process.exit(0);
}

main().catch((err) => {
  console.error("Gagal:", err && err.message ? err.message : err);
  process.exit(1);
});
