/**
 * tools/test-dash-guard-dom.js
 * ============================
 * Uji js/dash-guard.js di atas tiruan DOM (Node tanpa peramban). File guard
 * dijalankan apa adanya, lalu dipastikan:
 *   - teks, atribut, meta description, dan judul tab dibersihkan saat boot
 *   - konten yang disisipkan belakangan (mis. produk dari Firestore) ikut
 *     dibersihkan lewat jalur MutationObserver
 *   - isi <script>/<style> dan hyphen ASCII ("e-mail", "24/7") TIDAK diubah
 *
 * Jalankan: node tools/test-dash-guard-dom.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const EM = '\u2014'; // tanda garis yang diuji (tidak ditulis langsung di file ini)
const DASH = /[\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u2E3A\u2E3B\uFE58\uFE63\uFF0D]/;

/* ---------- tiruan DOM minimal ---------- */

function walkDepth(root, visit) {
  for (const child of root.childNodes) {
    visit(child);
    if (child.nodeType === 1) walkDepth(child, visit);
  }
}

function queryAll(root, selector) {
  const wanted = String(selector).split(',').map((s) => s.trim());
  const out = [];
  walkDepth(root, (n) => {
    if (n.nodeType !== 1) return;
    const hit = wanted.some((w) => {
      const m = /^([a-z]*)\[([a-z-]+)\]$/i.exec(w);
      if (!m) return false;
      if (m[1] && n.tagName !== m[1].toUpperCase()) return false;
      return n.hasAttribute(m[2]);
    });
    if (hit) out.push(n);
  });
  return out;
}

function el(tagName, attrs, children) {
  const node = {
    nodeType: 1,
    tagName: String(tagName).toUpperCase(),
    childNodes: [],
    ownerDocument: null,
    parentNode: null,
    _attrs: {},
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this._attrs, name); },
    getAttribute(name) { return this.hasAttribute(name) ? this._attrs[name] : null; },
    setAttribute(name, value) { this._attrs[name] = String(value); },
    querySelectorAll(sel) { return queryAll(this, sel); },
    append(child) {
      child.parentNode = this;
      child.ownerDocument = this.ownerDocument;
      this.childNodes.push(child);
      return child;
    },
  };
  for (const k of Object.keys(attrs || {})) node._attrs[k] = String(attrs[k]);
  for (const c of children || []) node.append(c);
  return node;
}

function txt(value) {
  return { nodeType: 3, nodeValue: value, parentNode: null, ownerDocument: null };
}

/* ---------- bangun pohon dokumen ---------- */

const titleNode = txt(`HekaStore ${EM} Top Up Game & Pulsa`);
const titleEl = el('title', null, [titleNode]);
const body = el('body', null, [
  el('h1', null, [txt(`Gamepass ${EM} Murah`)]),
  el('span', { class: 'price' }, [txt(`Rp 15rb ${EM} Rp 30rb`)]),
  el('img', { src: 'a.png', alt: `Ikon ${EM} produk`, title: `Judul ${EM} tooltip` }),
  el('script', null, [txt(`var isi = "data ${EM} jangan disentuh";`)]),
  el('style', null, [txt(`/* aturan ${EM} jangan diubah */`)]),
  el('p', null, [txt('e-mail dan layanan 24/7 harus tetap utuh')]),
]);
const docEl = el('html', null, [
  el('head', null, [titleEl, el('meta', { name: 'description', content: `Heka ${EM} Store: top up ${EM} murah` })]),
  body,
]);

const document = {
  nodeType: 9,
  documentElement: docEl,
  readyState: 'complete',
  addEventListener() {},
  createTreeWalker(root) {
    const list = [];
    walkDepth(root, (n) => { if (n.nodeType === 3) list.push(n); });
    let i = 0;
    return { nextNode: () => (i < list.length ? list[i++] : null) };
  },
  querySelectorAll(sel) { return queryAll(docEl, sel); },
};
docEl.ownerDocument = document;
walkDepth(docEl, (n) => { n.ownerDocument = document; });
Object.defineProperty(document, 'title', {
  get: () => titleNode.nodeValue,
  set: (v) => { titleNode.nodeValue = v; },
});

/* ---------- jalankan guard apa adanya ---------- */

let observerCallback = null;
class MutationObserverStub {
  constructor(cb) { observerCallback = cb; }
  observe() {}
  disconnect() {}
}

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'dash-guard.js'), 'utf8');
const sandbox = {
  document,
  console,
  setTimeout,
  MutationObserver: MutationObserverStub,
  NodeFilter: { SHOW_TEXT: 4, SHOW_ELEMENT: 1 },
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox; // perlakukan seperti peramban
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'js/dash-guard.js' });

/* ---------- pemeriksaan ---------- */

let fail = 0;
function check(label, got, want) {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? '  ok  ' : ' GAGAL'} ${label}`);
  if (!ok) console.log(`         dapat : ${JSON.stringify(got)}\n         harus : ${JSON.stringify(want)}`);
}

check('teks h1', body.childNodes[0].childNodes[0].nodeValue, 'Gamepass, Murah');
check('rentang harga', body.childNodes[1].childNodes[0].nodeValue, 'Rp 15rb s/d Rp 30rb');
check('atribut alt', body.childNodes[2].getAttribute('alt'), 'Ikon, produk');
check('atribut title', body.childNodes[2].getAttribute('title'), 'Judul, tooltip');
check('judul tab browser', document.title, 'HekaStore, Top Up Game & Pulsa');
check('isi script utuh', body.childNodes[3].childNodes[0].nodeValue, `var isi = "data ${EM} jangan disentuh";`);
check('isi style utuh', body.childNodes[4].childNodes[0].nodeValue, `/* aturan ${EM} jangan diubah */`);
check('hyphen & slash utuh', body.childNodes[5].childNodes[0].nodeValue, 'e-mail dan layanan 24/7 harus tetap utuh');
check('meta description', queryAll(docEl, 'meta[content]')[0].getAttribute('content'), 'Heka, Store: top up, murah');

/* konten dinamis: disisipkan SETELAH boot, lewat jalur MutationObserver */
const live = el('div', { class: 'product-label', 'aria-label': `Item ${EM} baru` }, [txt(`Diamond ${EM} 50`)]);
body.append(live);
observerCallback([{ type: 'childList', addedNodes: [live], target: body }], {});

setTimeout(() => {
  check('teks dinamis', live.childNodes[0].nodeValue, 'Diamond, 50');
  check('atribut dinamis', live.getAttribute('aria-label'), 'Item, baru');

  let leaked = 0;
  walkDepth(docEl, (n) => {
    if (n.nodeType !== 3) return;
    const tag = n.parentNode && n.parentNode.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE') return;
    if (DASH.test(n.nodeValue)) {
      leaked++;
      console.log('   garis tersisa di <' + tag + '>: ' + JSON.stringify(n.nodeValue));
    }
  });
  check('tidak ada garis tersisa di DOM', leaked, 0);

  console.log(fail ? `\n${fail} tes GAGAL` : '\nSemua tes DOM guard LULUS');
  process.exit(fail ? 1 : 0);
}, 60);

