/* ==========================================================================
   animate.js — lapisan animasi & micro-interaction bersama (HekaStore)
   Vanilla JS, tanpa build step. Berpasangan dengan css/animate.css.

   Prinsip:
   1. Class "an-js" baru dipasang di <html> oleh script ini. Tanpa script,
      tanpa CSS, atau saat JS error -> halaman tampil 100% normal.
   2. Elemen ditandai lewat selector, BUKAN lewat penulisan ulang markup,
      jadi tidak perlu mengubah struktur HTML halaman mana pun.
   3. Konten yang baru muncul setelahnya (grid nominal dari checkout.js,
      kartu hasil render main.js, tab, dsb) ikut tertangkap MutationObserver.
   4. Semua gerakan dimatikan bila user meminta prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  if (root.classList.contains("an-js")) return; // jangan pasang dua kali

  var mq = function (q) {
    return window.matchMedia && window.matchMedia(q).matches;
  };
  var REDUCED = mq("(prefers-reduced-motion: reduce)");
  var FINE_POINTER = mq("(hover: hover) and (pointer: fine)");

  /* Elemen yang akan "dinaikkan" saat masuk viewport. */
  var REVEAL_SEL = [
    ".banner",
    ".section",
    ".card",
    ".features p",
    ".quick-links",
    ".tabs",
    ".item",
    ".payment-card",
    ".gameCard",
    ".pulsaCard",
    ".listrikCard",
    ".jasa-promo-card",
    ".lb-card",
    "#profileContent > *"
  ].join(", ");

  /* Arah masuk per kelompok, supaya tidak semua halaman terasa sama. */
  function directionFor(el) {
    if (el.classList.contains("banner")) return "zoom";
    if (el.classList.contains("features") || el.tagName === "P") return "left";
    if (el.classList.contains("quick-links") || el.classList.contains("tabs")) return "down";
    if (el.closest && el.closest("footer")) return "up";
    return "up";
  }

  var seen = new WeakSet();

  var io = null;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("an-in");
          io.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 }
    );
  }

  function mark(el) {
    if (!el || el.nodeType !== 1 || seen.has(el)) return;
    if (el.hasAttribute("data-an")) return;
    seen.add(el);
    el.setAttribute("data-an", directionFor(el));

    /* Jeda bertingkat antar saudara kandung: grid nominal terasa "menetas". */
    var parent = el.parentElement;
    if (parent) {
      var idx = Array.prototype.indexOf.call(parent.children, el);
      el.style.setProperty("--an-delay", Math.min(Math.max(idx, 0), 8) * 55 + "ms");
    }

    if (io) io.observe(el);
    else el.classList.add("an-in"); // browser tua: tampilkan saja
  }

  function scan(scope) {
    if (REDUCED) return; // jangan sembunyikan apa pun
    var base = scope || document;
    var list = base.nodeType === 1 ? base.querySelectorAll(REVEAL_SEL) : document.querySelectorAll(REVEAL_SEL);
    Array.prototype.forEach.call(list, mark);
    if (base === document) {
      /* #profileContent diisi belakangan oleh profile.js */
      var pc = document.getElementById("profileContent");
      if (pc) Array.prototype.forEach.call(pc.children, mark);
    }
  }

  /* ---------- Konten yang dirender belakangan (checkout.js / main.js) ---------- */
  if ("MutationObserver" in window) {
    var queued = false;
    var mo = new MutationObserver(function (mutations) {
      if (queued || REDUCED) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        mutations.forEach(function (m) {
          Array.prototype.forEach.call(m.addedNodes, function (node) {
            if (node.nodeType !== 1) return;
            mark(node);
            Array.prototype.forEach.call(node.querySelectorAll(REVEAL_SEL), mark);
          });
        });
      });
    });
    document.addEventListener("DOMContentLoaded", function () {
      mo.observe(document.body, { childList: true, subtree: true });
    });
  }

  /* ---------- Failsafe: tidak boleh ada elemen/gambar yang hilang selamanya ---------- */
  function sweep() {
    var stuck = document.querySelectorAll("[data-an]:not(.an-in)");
    Array.prototype.forEach.call(stuck, function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight && r.height > 0) {
        el.classList.add("an-in");
        if (io) io.unobserve(el);
      }
    });
    /* Gambar cached / rusak / tanpa src: complete === true, amankan di sini. */
    Array.prototype.forEach.call(
      document.querySelectorAll("img[data-an-img]:not(.an-loaded)"),
      function (img) {
        if (img.complete) img.classList.add("an-loaded");
      }
    );
  }

  /* ---------- Ripple pada tombol / tab / chip yang bisa diklik ---------- */
  var RIPPLE_SEL =
    "#btn-hijau, .konfirm-btn, .chooseBuy button, .buttonGameCard, .jasa-promo-cta, " +
    ".download-btn, .tab, .quick-link, .copy-mini, .copy-chip, .print-btn, .banner .btn";

  var bound = new WeakSet(); // elemen yang sudah dipasangi listener interaksi

  function attachRipple(el) {
    if (bound.has(el)) return;
    bound.add(el);
    el.classList.add("an-rip");
    el.addEventListener("pointerdown", function (e) {
      var rect = el.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var span = document.createElement("span");
      span.className = "an-ripple";
      span.style.width = span.style.height = size + "px";
      span.style.left = e.clientX - rect.left - size / 2 + "px";
      span.style.top = e.clientY - rect.top - size / 2 + "px";
      el.appendChild(span);
      setTimeout(function () {
        span.remove();
      }, 650);
    });
  }

  function bindRipples(scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(RIPPLE_SEL), attachRipple);
  }

  /* ---------- Tilt 3D ringan untuk kartu (khusus perangkat pointer presisi) ---------- */
  var TILT_SEL = ".item, .gameCard, .jasa-promo-card, .payment-card";

  function attachTilt(el) {
    if (el.dataset.anTilt) return;
    el.dataset.anTilt = "1";
    el.addEventListener("mousemove", function (e) {
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - r.left) / r.width - 0.5;
      var dy = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform =
        "translateY(-5px) perspective(600px) rotateX(" +
        (-dy * 5).toFixed(2) +
        "deg) rotateY(" +
        (dx * 6).toFixed(2) +
        "deg)";
    });
    el.addEventListener("mouseleave", function () {
      el.style.transform = "";
    });
  }

  function bindTilts(scope) {
    if (!FINE_POINTER || REDUCED) return;
    Array.prototype.forEach.call((scope || document).querySelectorAll(TILT_SEL), attachTilt);
  }

  /* ---------- Denyut kecil saat nominal dipilih ---------- */
  document.addEventListener(
    "click",
    function (e) {
      var item = e.target.closest && e.target.closest(".item");
      if (!item) return;
      var price = item.querySelector("p, span");
      if (!price) return;
      price.classList.remove("an-tick");
      void price.offsetWidth; // paksa animasi dijalankan ulang
      price.classList.add("an-tick");
      setTimeout(function () {
        price.classList.remove("an-tick");
      }, 500);
    },
    { passive: true }
  );

  /* ---------- Bilah progres baca + header menempel ---------- */
  function buildChrome() {
    var bar = document.getElementById("anProgress");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "anProgress";
      bar.setAttribute("aria-hidden", "true");
      bar.appendChild(document.createElement("i"));
      document.body.appendChild(bar);
    }
    var fill = bar.firstChild;
    var nav = document.querySelector(".navbar") || document.querySelector("header");

    var ticking = false;
    function update() {
      ticking = false;
      var max = root.scrollHeight - window.innerHeight;
      var pct = max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0;
      fill.style.width = pct.toFixed(2) + "%";
      if (nav) nav.classList.toggle("an-stuck", window.scrollY > 10);
    }
    window.addEventListener(
      "scroll",
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(update);
      },
      { passive: true }
    );
    update();
  }

  /* ---------- Gambar: baru tampil setelah benar-benar ter-decode ---------- */
  function bindImages(scope) {
    var imgs = (scope || document).querySelectorAll("img:not([data-an-img])");
    Array.prototype.forEach.call(imgs, function (img) {
      img.setAttribute("data-an-img", "");
      var done = function () {
        img.classList.add("an-loaded");
      };
      if (img.complete && img.naturalWidth > 0) done();
      else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
  }

  /* ---------- Inisialisasi (fail-open: error = halaman kembali normal) ---------- */
  function init() {
    try {
      root.classList.add("an-js");
      scan(document);
      bindRipples(document);
      bindTilts(document);
      bindImages(document);
      buildChrome();
      sweep();
      window.addEventListener("load", sweep);
      setTimeout(sweep, 2500);
      setTimeout(sweep, 6000); // jaring pengaman terakhir
    } catch (err) {
      root.classList.remove("an-js");
      if (window.console && console.warn) {
        console.warn("[animate] dinonaktifkan karena error:", err);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* Titik masuk opsional bagi script lain yang merender blok besar. */
  window.HekaAnimate = {
    refresh: function (scope) {
      scan(scope || document);
      bindRipples(scope);
      bindTilts(scope);
      bindImages(scope);
    }
  };
})();


