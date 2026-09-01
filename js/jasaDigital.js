// js/jasaDigital.js
// Interaksi & animasi khusus halaman Jasa Digital (HekaLabs Studio):
// reveal on scroll berjenjang, counter statistik hero, efek mengetik,
// tilt 3D pada kartu, ripple tombol, FAQ accordion tunggal, dan
// progress bar baca halaman.
// Pola sama dengan js/search.js: IIFE vanilla, tanpa library eksternal.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // Penanda JS aktif — animasi reveal hanya jalan bila class ini ada
  // (tanpa JS, semua konten tetap tampil normal).
  document.documentElement.classList.add("jd-js");

  // ==============================
  // 1. Reveal on scroll (stagger)
  // ==============================
  var groups = document.querySelectorAll(
    ".card.layanan, .jd-grid, .jd-proj, .jd-steps, .jd-why, .jd-testi, .jd-faq, .jd-cta, " +
    "#formUserId, #pilihNominal, #metodePembayaran, #dataPemesan"
  );
  groups.forEach(function (group) {
    var staggered = group.matches(".jd-grid, .jd-proj, .jd-steps, .jd-faq");
    var targets = staggered ? Array.prototype.slice.call(group.children) : [group];
    targets.forEach(function (el, i) {
      el.classList.add("jd-reveal");
      el.style.setProperty("--rd", (i % 8) * 0.09 + "s");
    });
  });

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("jd-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".jd-reveal").forEach(function (el) { io.observe(el); });
  } else {
    // Tanpa IO / reduksi gerak: langsung tampilkan semua
    document.querySelectorAll(".jd-reveal").forEach(function (el) { el.classList.add("jd-in"); });
  }

  // ==========================
  // 2. Counter statistik hero
  // ==========================
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-jd-count"), 10) || 0;
    if (reduceMotion) { el.textContent = String(target); return; }
    var duration = 1300;
    var start = null;
    function tick(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
      el.textContent = String(Math.round(target * eased));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll("[data-jd-count]");
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              cio.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.4 }
      );
      counters.forEach(function (el) { cio.observe(el); });
    } else {
      counters.forEach(animateCount);
    }
  }

  // =========================
  // 3. Efek mengetik di hero
  // =========================
  var typeEl = document.getElementById("jdTypeWord");
  if (typeEl && !reduceMotion) {
    var words = ["Website", "UI/UX Design", "Video Editing", "IoT Pintar", "Tools Otomasi"];
    var wi = 0;
    var ci = words[0].length; // mulai dari kata pertama yang sudah lengkap
    var deleting = true;
    function typeLoop() {
      var word = words[wi];
      ci += deleting ? -1 : 1;
      typeEl.textContent = word.substring(0, Math.max(ci, 0));
      var delay = deleting ? 45 : 95;
      if (!deleting && ci >= word.length) {
        delay = 2000; // jeda membaca
        deleting = true;
      } else if (deleting && ci <= 0) {
        deleting = false;
        wi = (wi + 1) % words.length;
        delay = 350;
      }
      setTimeout(typeLoop, delay);
    }
    setTimeout(typeLoop, 1800);
  }

  // ==========================================
  // 4. Tilt 3D kartu (hanya perangkat ber-mouse)
  // ==========================================
  if (canHover && !reduceMotion) {
    document.querySelectorAll(".jd-card, .jd-proj-card, .jd-step").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -7;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 7;
        card.style.transform =
          "perspective(700px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-4px)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }

  // ============================
  // 5. Ripple pada tombol hero/CTA
  // ============================
  document.querySelectorAll(".jd-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      if (reduceMotion) return;
      var r = btn.getBoundingClientRect();
      var d = Math.max(r.width, r.height) * 2;
      var s = document.createElement("span");
      s.className = "jd-ripple";
      s.style.width = s.style.height = d + "px";
      s.style.left = (e.clientX - r.left - d / 2) + "px";
      s.style.top = (e.clientY - r.top - d / 2) + "px";
      btn.appendChild(s);
      setTimeout(function () { s.remove(); }, 650);
    });
  });

  // ===================================
  // 6. FAQ accordion — buka satu saja
  // ===================================
  var faqItems = document.querySelectorAll(".jd-faq-item");
  faqItems.forEach(function (item) {
    item.addEventListener("toggle", function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.open = false;
        });
      }
    });
  });

  // ==========================
  // 7. Progress bar baca halaman
  // ==========================
  var bar = document.getElementById("jdProgressBar");
  if (bar) {
    var updateBar = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var top = window.pageYOffset || h.scrollTop || 0;
      bar.style.width = (max > 0 ? (top / max) * 100 : 0) + "%";
    };
    window.addEventListener("scroll", updateBar, { passive: true });
    window.addEventListener("resize", updateBar);
    updateBar();
  }
})();