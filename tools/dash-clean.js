/**
 * tools/dash-clean.js
 * ===================
 * Pemeriksa + pembersih seluruh tanda garis model em dash (U+2014), en dash
 * (U+2013), minus sign (U+2212), dsb. di dalam file sumber proyek ini.
 *
 * Aturan penggantian MENGIKUT js/dash-guard.js (HekaDash.clean) supaya hasil
 * di file dan di layar pengguna sama:
 *   - angka [garis] angka      -> "s/d"
 *   - frasa [garis] frasa      -> koma
 *   - [garis] di ujung teks    -> dihapus
 *   - hyphen ASCII "-" dibiarkan (dipakai untuk penulisan normal)
 *
 * Cara pakai (dari root folder):
 *   node tools/dash-clean.js            -> hanya melapor (tidak mengubah apa pun)
 *   node tools/dash-clean.js --write    -> terapkan perubahan ke file
 *   node tools/dash-clean.js --write --all  -> sertakan README/DEPLOY/docs juga
 *
 * Catatan: file biner (gambar, font) dan node_modules selalu dilewati.
 */
const fs = require("fs");
const path = require("path");
const { clean } = require("../js/dash-guard.js");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".firebase"]);
const BINARY = /\.(webp|png|jpe?g|gif|ico|bmp|avif|woff2?|ttf|otf|eot|mp4|webm|ogg|mp3|pdf|zip|cache)$/i;
const DOCS = /\.(md|txt)$/i;

const DASHLIKE = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u2E3A\u2E3B\uFE58\uFE63\uFF0D]/g;
const ENTITY = /&mdash;|&ndash;|&#\s*821[123];?|&#x\s*201[34];?/gi;

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const WITH_DOCS = args.includes("--all");

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    // scanner-nya sendiri tidak ikut dipindai: ia memuat pola entity & daftar
    // codepoint yang akan terbaca sebagai temuan palsu
    else if (entry.isFile() && !BINARY.test(entry.name) && path.resolve(p) !== __filename) files.push(p);
  }
})(ROOT);

let touched = 0;
let hitChars = 0;
const entityOnly = [];

for (const p of files) {
  const rel = path.relative(ROOT, p);
  if (!WITH_DOCS && DOCS.test(rel)) continue;

  const original = fs.readFileSync(p, "utf8");
  const chars = original.match(DASHLIKE) || [];
  const ents = original.match(ENTITY) || [];

  if (!chars.length && !ents.length) continue;
  hitChars += chars.length;

  if (!chars.length && ents.length) {
    entityOnly.push(`${rel} (entity: ${ents.join(", ")})`);
    continue;
  }

  if (!WRITE) {
    console.log(`\n${rel}  (${chars.length} karakter garis)`);
    original.split(/\r?\n/).forEach((line, i) => {
      if (DASHLIKE.test(line)) {
        DASHLIKE.lastIndex = 0;
        console.log(`   ${i + 1}: ${line.trim().slice(0, 120)}`);
      }
      DASHLIKE.lastIndex = 0;
    });
    touched++;
    continue;
  }

  // Pertahankan akhiran baris (CRLF/LF) dan BOM bila ada.
  const bom = original.charCodeAt(0) === 0xfeff ? "\ufeff" : "";
  const body = bom ? original.slice(1) : original;
  const crlf = body.includes("\r\n");
  const fixed = clean(body).replace(/\r\n/g, "\n");
  const out = crlf ? fixed.replace(/\n/g, "\r\n") : fixed;

  if (out !== body) {
    fs.writeFileSync(p, bom + out, "utf8");
    touched++;
    console.log(`DIUBAH: ${rel}`);
  }
}

console.log(`\nRingkasan: ${hitChars} karakter garis di ${touched} file.` +
  (WRITE ? " (sudah diperbaiki)" : " (dry-run: tambahkan --write untuk memperbaiki)"));
if (entityOnly.length) {
  console.log("Masih memakai entity HTML (perbaiki manual):\n  " + entityOnly.join("\n  "));
}
