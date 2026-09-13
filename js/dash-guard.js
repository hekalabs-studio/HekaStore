/**
 * js/dash-guard.js
 * ================
 * Menghapus seluruh tanda garis panjang (em dash U+2014, en dash U+2013,
 * minus sign U+2212, dsb.) dari teks yang DITAMPILKAN website.
 *
 * Kenapa perlu?
 *   - Semua file sumber (HTML/CSS/JS) sudah bersih dari tanda garis panjang,
 *     TETAPI teks yang datang dari data dinamis tetap bisa membawanya: label
 *     produk di Firestore, isi riwayat transaksi, hasil query, dst.
 *   - File ini menjadi jaring pengaman terakhir di sisi tampilan, jadi tanda
 *     garis tidak muncul lagi walaupun datanya belum dibersihkan di database.
 *
 * Aturan penggantian (hyphen ASCII "-" dan "/" TIDAK pernah disentuh, supaya
 * penulisan normal seperti "e-mail" atau "24/7" tidak rusak):
 *   1. menggantung di ujung teks   -> dihapus
 *   2. di antara dua angka         -> " s/d "   contoh: 15 [garis] 30 -> 15 s/d 30
 *   3. di depan nominal "Rp"       -> " s/d "   Rp 15rb [garis] Rp 30rb
 *   4. diapit spasi (pemisah frasa)-> ", "      Game [garis] Murah -> Game, Murah
 *   5. selebihnya                  -> ", " lalu spasi/koma dirapikan
 *
 * Dipakai di: semua halaman (index.html, profile.html, html/*.html).
 * Bisa dipanggil manual: HekaDash.clean(str) / HekaDash.applyNow()
 */
(function (global) {
  'use strict';

  /* Kelas karakter garis yang dianggap "tanda garis panjang". Hyphen ASCII
     U+002D sengaja tidak ikut agar penulisan biasa tidak ikut berubah. */
  var DASH_CHARS = '\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u2E3A\u2E3B\uFE58\uFE63\uFF0D';
  var HAS_DASH = new RegExp('[' + DASH_CHARS + ']');
  var RUNS = new RegExp('[' + DASH_CHARS + ']+', 'g');

  var TRAIL_WS = /\s+$/;
  var LEAD_WS = /^\s+/;
  var TWIN_SPACE = /[ \t]{2,}/g;
  var SPACE_BEFORE_PUNCT = /[ \t]+([,.;:!?)\]\}])/g;
  var SPACE_AFTER_OPEN = /([([{])\s+/g;

  function isDigit(ch) { return ch >= '0' && ch <= '9'; }

  /* Putuskan pengganti satu gerombolan tanda garis berdasarkan potongan teks
     di kiri dan kanannya. Lookbehind sengaja tidak dipakai agar tetap jalan di
     Safari iOS versi lama. */
  function replacementFor(left, right) {
    var leftTrim = left.replace(TRAIL_WS, '');
    var rightTrim = right.replace(LEAD_WS, '');

    // 1) garis di awal/akhir teks -> buang
    if (leftTrim === '' || rightTrim === '') {
      return /\s$/.test(left) && /^\s/.test(right) ? ' ' : '';
    }

    var leftChar = leftTrim.charAt(leftTrim.length - 1);

    // 1.5) minus matematis di depan angka: "[garis]50" -> "-50" pakai hyphen
    //      ASCII biasa (U+002D), bukan tanda garis panjang.
    if (/\s$/.test(left) && !/^\s/.test(right) && /^\d|^[.,]\d/.test(rightTrim)) return '-';

    // 2) rentang angka: "1.000 [garis] 2.000" -> "1.000 s/d 2.000"
    if (isDigit(leftChar) && isDigit(rightTrim.charAt(0))) return ' s/d ';

    // 3) rentang harga: "Rp 15rb [garis] Rp 30rb" -> "Rp 15rb s/d Rp 30rb"
    if (/^rp[\s.\d]/i.test(rightTrim) && /(\d|rb|jt|ribu|juta|miliar)$/i.test(leftTrim)) return ' s/d ';

    // 4) pemisah frasa yang sama-sama berdampingan spasi -> koma
    if (/\s$/.test(left) && /^\s/.test(right)) return ', ';

    // 5) satu sisi berspasi -> cukup satu spasi; tanpa spasi -> koma
    return /\s$/.test(left) || /^\s/.test(right) ? ' ' : ', ';
  }

  function tidy(text) {
    return text
      .replace(TWIN_SPACE, ' ')
      .replace(SPACE_BEFORE_PUNCT, '$1')
      .replace(SPACE_AFTER_OPEN, '$1');
  }

  /** Bersihkan satu string dari seluruh tanda garis panjang. */
  function clean(value) {
    var str = value == null ? '' : String(value);
    if (!HAS_DASH.test(str)) return str;

    var chunks = str.split(RUNS);
    if (chunks.length < 2) return str;

    var out = chunks[0];
    for (var i = 1; i < chunks.length; i++) {
      out += replacementFor(out, chunks[i]) + chunks[i];
    }
    return tidy(out);
  }

  /* Atribut yang isinya dibaca pengunjung. Atribut teknis (src, href, class,
     id, style, dst.) tidak disentuh supaya tidak merusak tampilan/tautan. */
  var TEXT_ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'content'];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, PRE: 1, CODE: 1 };

  var mutating = false;

  function cleanElement(el) {
    if (!el || el.nodeType !== 1 || SKIP_TAGS[el.tagName] || !el.hasAttribute) return;
    for (var i = 0; i < TEXT_ATTRS.length; i++) {
      var name = TEXT_ATTRS[i];
      // "content" hanya bermakna teks pada <meta>; pada elemen lain dilewati.
      if (name === 'content' && el.tagName !== 'META') continue;
      if (!el.hasAttribute(name)) continue;
      var oldVal = el.getAttribute(name);
      var newVal = clean(oldVal);
      if (newVal !== oldVal) {
        mutating = true;
        el.setAttribute(name, newVal);
        mutating = false;
      }
    }
  }

  function cleanTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    var parent = node.parentNode;
    if (!parent || SKIP_TAGS[parent.tagName]) return;
    var old = node.nodeValue;
    var next = clean(old);
    if (next === old) return;
    mutating = true;
    node.nodeValue = next;
    // Judul tab browser dikunci agar hasilnya sama di semua engine.
    if (parent.tagName === 'TITLE' && global.document && 'title' in global.document) {
      global.document.title = next;
    }
    mutating = false;
  }

  /** Sapukan pembersihan ke seluruh dokumen, atau ke satu root bila dikirim. */
  function applyNow(root) {
    var doc = global.document;
    if (!doc || !doc.documentElement) return;
    var scope = root && root.nodeType ? root : doc.documentElement;
    mutating = true;

    if (scope.nodeType === 3) {
      cleanTextNode(scope);
    } else if (doc.createTreeWalker) {
      var walker = doc.createTreeWalker(scope, 4 /* SHOW_TEXT */, null, false);
      var textNodes = [];
      var n;
      while ((n = walker.nextNode())) textNodes.push(n);
      for (var i = 0; i < textNodes.length; i++) cleanTextNode(textNodes[i]);
    }

    if (scope.querySelectorAll) {
      var els = scope.querySelectorAll('[' + TEXT_ATTRS.join('],[') + ']');
      for (var j = 0; j < els.length; j++) cleanElement(els[j]);
    }
    var metas = doc.querySelectorAll ? doc.querySelectorAll('meta[content]') : [];
    for (var k = 0; k < metas.length; k++) cleanElement(metas[k]);

    mutating = false;
  }


  /**
   * Awasi DOM: konten yang muncul belakangan (mis. produk dari Firestore atau
   * riwayat transaksi) ikut dibersihkan begitu disisipkan ke halaman.
   */
  function startWatch() {
    var doc = global.document;
    var hasDom = doc && doc.documentElement;

    if (!hasDom || typeof global.MutationObserver !== 'function') {
      // Peramban tanpa MutationObserver: jadwalkan penyapuan berkala.
      if (hasDom && typeof global.setInterval === 'function') {
        global.setInterval(function () { applyNow(); }, 1200);
      }
      return;
    }

    var queue = [];
    var scheduled = false;

    function flush() {
      scheduled = false;
      mutating = true;
      for (var i = 0; i < queue.length; i++) {
        var node = queue[i];
        if (!node || !node.ownerDocument) continue;
        if (node.nodeType === 3) {
          cleanTextNode(node);
        } else if (node.nodeType === 1) {
          cleanElement(node);
          applyNow(node);
        }
      }
      queue.length = 0;
      mutating = false;
    }

    function schedule(node) {
      queue.push(node);
      if (scheduled) return;
      scheduled = true;
      if (typeof global.requestAnimationFrame === 'function') {
        global.requestAnimationFrame(flush);
      } else {
        global.setTimeout(flush, 16);
      }
    }

    new global.MutationObserver(function (records) {
      if (mutating) return; // abaikan perubahan yang dibuat guard sendiri
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'childList') {
          for (var a = 0; a < r.addedNodes.length; a++) schedule(r.addedNodes[a]);
        } else {
          schedule(r.target);
        }
      }
    }).observe(doc.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TEXT_ATTRS,
    });
  }

  function boot() {
    applyNow();
    startWatch();
  }

  var api = {
    clean: clean,
    applyNow: applyNow,
    startWatch: startWatch,
    DASH_CHARS: DASH_CHARS,
  };
  global.HekaDash = api;

  // Ekspor untuk pengujian di Node (di peramban baris ini dilewati).
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

  if (global.document) {
    if (global.document.readyState === 'loading') {
      global.document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }
})(typeof window !== 'undefined' ? window : this);

