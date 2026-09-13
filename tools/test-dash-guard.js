/**
 * tools/test-dash-guard.js
 * Uji cepat untuk js/dash-guard.js: jalankan `node tools/test-dash-guard.js`.
 * Tidak memakai framework apa pun supaya bisa langsung jalan di proyek ini.
 */
const assert = require("assert");
const { clean } = require("../js/dash-guard.js");

// Karakter uji ditulis dengan escape agar file tes ini sendiri bebas dash Unicode.
const EM = "\u2014"; // em dash
const EN = "\u2013"; // en dash
const MIN = "\u2212"; // minus sign

const cases = [
  // [deskripsi, masukan, keluaran diharapkan]
  ["judul halaman", `HekaaPedia ${EM} Top Up Game Murah`, "HekaaPedia, Top Up Game Murah"],
  ["rentang angka", `100 ${EN} 200 Diamond`, "100 s/d 200 Diamond"],
  ["rentang rupiah", `Rp 15rb ${EM} Rp 30rb`, "Rp 15rb s/d Rp 30rb"],
  ["garis di awal", `${EM}Promo Hari Ini`, "Promo Hari Ini"],
  ["garis di akhir", `Promo Hari Ini${EM}`, "Promo Hari Ini"],
  ["gerombolan garis", `A ${EM}${EM}${EN} B`, "A, B"],
  ["minus di angka", `Sisa ${MIN}50 poin`, "Sisa -50 poin"],
  ["tanpa spasi", `Game${EM}Online`, "Game, Online"],
  ["hyphen biasa utuh", "e-mail 24/7 top-up", "e-mail 24/7 top-up"],
  ["teks bersih", "Harga termurah, proses cepat", "Harga termurah, proses cepat"],
  ["koma tidak dobel", `A ${EM}, B`, "A, B"],
  ["titik akhir", `Roblox ${EM}.`, "Roblox."],
  ["minus desimal", `Kurs ${MIN}0,5 persen`, "Kurs -0,5 persen"],
  ["garis ganda", `1 ${EM}${EN} 2`, "1 s/d 2"],
];

let gagal = 0;
for (const [nama, masuk, harus] of cases) {
  try {
    assert.strictEqual(clean(masuk), harus);
    console.log(`  ok   ${nama}`);
  } catch (e) {
    gagal++;
    console.log(`  GAGAL ${nama}\n         masuk : ${JSON.stringify(masuk)}\n         dapat  : ${JSON.stringify(e.actual)}\n         harus  : ${JSON.stringify(harus)}`);
  }
}

// Tidak boleh ada satu pun sisa garis Unicode di keluaran mana pun.
const SISA = /[\u2010-\u2015\u2212\u2E3A\u2E3B\uFE58\uFE63\uFF0D]/;
for (const [nama, masuk] of cases.map((c) => [c[0], c[1]])) {
  const hasil = clean(masuk);
  if (SISA.test(hasil)) {
    gagal++;
    console.log(`  GAGAL sisa-karakter pada "${nama}" -> ${JSON.stringify(hasil)}`);
  }
}

console.log(gagal ? `\n${gagal} tes GAGAL` : `\nSemua ${cases.length + cases.length} pemeriksaan LULUS`);
process.exit(gagal ? 1 : 0);
