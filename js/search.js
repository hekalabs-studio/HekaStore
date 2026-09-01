// js/search.js
// Pencarian produk Hekaapedia: saran langsung (live suggestion) + halaman hasil.
// - Di index.html : hasil pencarian ditampilkan langsung dalam section khusus.
// - Di halaman lain: Enter mengarahkan ke index.html?q=... agar hasil tetap tampil.
// CSS di-inject dari sini (pola sama dengan auth-ui.js) supaya tampilan konsisten
// di semua halaman tanpa perlu menambah stylesheet di 10+ file HTML.

(function () {
  // Path aset berbeda antara halaman root (index.html) dan halaman di /html/
  const IN_HTML_DIR = window.location.pathname.includes("/html/");
  const P = IN_HTML_DIR ? "../" : "./";
  const INDEX_URL = IN_HTML_DIR ? "../index.html" : "index.html";

  // ========================
  // Katalog produk
  // ========================
  const CATALOG = [
    // Games
    { name: "Mobile Legends", img: P + "img/games/logoml.webp", link: IN_HTML_DIR ? "mobileLegend.html" : "html/mobileLegend.html", category: "Game", keywords: "ml moonton diamond top up" },
    { name: "Free Fire", img: P + "img/games/logoff.webp", link: IN_HTML_DIR ? "freefire.html" : "html/freefire.html", category: "Game", keywords: "ff garena diamond top up" },
    { name: "Roblox", img: P + "img/games/roblox.webp", link: IN_HTML_DIR ? "roblox.html" : "html/roblox.html", category: "Game", keywords: "robux gamepass" },
    { name: "PUBG Mobile", img: P + "img/games/pubg.webp", link: "", category: "Game", keywords: "pubg uc" },
    { name: "Genshin Impact", img: P + "img/games/logo-genshin.webp", link: "", category: "Game", keywords: "genshin genesis crystal hoyoverse" },
    { name: "Call of Duty Mobile", img: P + "img/games/logocod.webp", link: "", category: "Game", keywords: "cod call of duty cp garena" },
    { name: "Sausage Man", img: P + "img/games/sausageman.webp", link: "", category: "Game", keywords: "sausage man" },
    { name: "Super Sus", img: P + "img/games/supersus.webp", link: "", category: "Game", keywords: "super sus among" },
    // Pulsa
    { name: "Pulsa Telkomsel", img: P + "img/pulsa/telkomsel.webp", link: IN_HTML_DIR ? "PulsaTelkomsel.html" : "html/PulsaTelkomsel.html", category: "Pulsa", keywords: "telkomsel kuota data paket" },
    { name: "Pulsa Three (Tri)", img: P + "img/pulsa/tri.webp", link: IN_HTML_DIR ? "pulsaTri.html" : "html/pulsaTri.html", category: "Pulsa", keywords: "tri three kuota data paket" },
    { name: "Pulsa Indosat", img: P + "img/pulsa/indosat.webp", link: IN_HTML_DIR ? "pulsaIndosat.html" : "html/pulsaIndosat.html", category: "Pulsa", keywords: "indosat im3 ooredoo kuota data" },
    { name: "Pulsa XL", img: P + "img/pulsa/xl.webp", link: IN_HTML_DIR ? "pulsaXL.html" : "html/pulsaXL.html", category: "Pulsa", keywords: "xl axis kuota data paket" },
    // Token Listrik
    { name: "Token Listrik PLN", img: P + "img/logopln.webp", link: IN_HTML_DIR ? "tokenListrik.html" : "html/tokenListrik.html", category: "Token Listrik", keywords: "listrik pln prabayar token" },
    // Jasa Digital (HekaLabs Studio)
    { name: "Jasa Digital", img: P + "img/logotoko2.webp", link: IN_HTML_DIR ? "jasaDigital.html" : "html/jasaDigital.html", category: "Jasa Digital", keywords: "jasa website web app landing page ui ux desain edit video motion graphic iot smart home python hekalabs developer program" },
  ];

  const SEARCH_CSS = `
    .heka-search-box{position:relative;flex:1 1 300px;max-width:540px}
    .heka-search-box .search-bar{width:100%;margin:0;padding:11px 48px 11px 18px;border-radius:999px;border:2px solid transparent;outline:none;font-size:.95rem;color:#222;background:#fff;font-family:inherit;transition:border-color .2s ease,box-shadow .2s ease}
    .heka-search-box .search-bar:focus{border-color:#7ef0d0;box-shadow:0 0 0 4px rgba(255,255,255,.18)}
    .heka-search-btn{position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:none;border-radius:50%;background:linear-gradient(135deg,#0c937b,#2ed9b3);color:#fff;font-size:.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:filter .2s ease,transform .2s ease}
    .heka-search-btn:hover{filter:brightness(1.12);transform:translateY(-50%) scale(1.06)}
    .heka-search-suggestions{position:absolute;top:calc(100% + 8px);left:0;right:0;background:#fff;color:#222;border-radius:14px;box-shadow:0 14px 36px rgba(0,0,0,.22);overflow:hidden;display:none;z-index:700;text-align:left}
    .heka-search-suggestions.open{display:block}
    .heka-suggestion{display:flex;align-items:center;gap:12px;padding:9px 14px;cursor:pointer;transition:background .15s ease;border-bottom:1px solid #f3f6f5}
    .heka-suggestion:last-child{border-bottom:none}
    .heka-suggestion:hover,.heka-suggestion.highlighted{background:#ecfdf8}
    .heka-suggestion img{width:42px;height:42px;object-fit:contain;border-radius:9px;background:#f1f5f4;padding:3px;flex-shrink:0}
    .heka-suggestion-name{font-weight:600;font-size:.92rem;color:#1c2b28}
    .heka-suggestion-name b{color:#0c937b}
    .heka-suggestion-cat{margin-left:auto;font-size:.72rem;font-weight:700;color:#0c937b;background:#e6faf4;padding:3px 10px;border-radius:999px;white-space:nowrap;flex-shrink:0}
    .heka-suggestion-empty{padding:16px;text-align:center;color:#7a8a86;font-size:.9rem}
    .heka-search-results{max-width:1200px;margin:0 auto;padding:26px 20px}
    .heka-search-results h3{margin-bottom:4px}
    .heka-search-sub{color:#5b6b67;font-size:.9rem;margin-bottom:16px}
    /* Kartu hasil dibuat ukurannya wajar walau hasil cuma 1-2
       (grid lama pakai auto-fit yang menyusutkan kolom kosong -> kartu jadi raksasa) */
    .heka-search-results .list-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
    .heka-search-results .gameCard{padding:12px}
    .heka-search-clear{margin-top:18px;border:1.5px solid #0c937b;background:#fff;color:#0c937b;font-weight:700;padding:9px 20px;border-radius:999px;cursor:pointer;font-family:inherit;transition:background .2s ease,color .2s ease}
    .heka-search-clear:hover{background:#0c937b;color:#fff}
  `;

  function normalize(value) {
    return (value || "").toLowerCase().trim();
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function searchProducts(query) {
    const q = normalize(query);
    if (!q) return [];
    return CATALOG.filter(
      (item) =>
        normalize(item.name).includes(q) ||
        normalize(item.keywords).includes(q) ||
        normalize(item.category).includes(q)
    );
  }

  function highlightName(name, query) {
    const q = normalize(query);
    if (!q) return escapeHtml(name);
    const idx = normalize(name).indexOf(q);
    if (idx === -1) return escapeHtml(name);
    return (
      escapeHtml(name.slice(0, idx)) +
      "<b>" + escapeHtml(name.slice(idx, idx + q.length)) + "</b>" +
      escapeHtml(name.slice(idx + q.length))
    );
  }

  // Arahkan user ke halaman produk. Produk yang belum punya halaman
  // (PUBG, Genshin, dll) diarahkan ke daftar kategori Games di index.
  function openProduct(item) {
    if (item.link) {
      window.location.href = item.link;
      return;
    }
    if (!IN_HTML_DIR) {
      const tab = document.getElementById("games");
      if (tab) tab.click();
      const target = document.getElementById("listJudul");
      if (target) target.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = INDEX_URL + "#listJudul";
    }
  }

  // ========================
  // Section hasil pencarian (index.html saja)
  // ========================
  function ensureResultsSection() {
    let section = document.getElementById("hekaSearchResults");
    if (section) return section;

    section = document.createElement("section");
    section.id = "hekaSearchResults";
    section.className = "heka-search-results";
    section.hidden = true;
    section.innerHTML = `
      <h3 id="hekaSearchTitle"></h3>
      <p class="heka-search-sub" id="hekaSearchSub"></p>
      <div class="list-grid" id="hekaSearchGrid"></div>
      <button type="button" class="heka-search-clear" id="hekaSearchClear">✕ Bersihkan pencarian</button>
    `;
    const banner = document.querySelector(".banner-slider");
    if (banner && banner.parentElement) {
      banner.after(section);
    } else {
      document.body.prepend(section);
    }

    section.querySelector("#hekaSearchClear").addEventListener("click", () => {
      section.hidden = true;
      const input = document.querySelector(".search-bar");
      if (input) input.value = "";
      history.replaceState(null, "", window.location.pathname);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    return section;
  }

  function renderResults(query) {
    const section = ensureResultsSection();
    const items = searchProducts(query);
    const grid = section.querySelector("#hekaSearchGrid");

    section.querySelector("#hekaSearchTitle").textContent = '🔍 Hasil pencarian: "' + query + '"';
    section.querySelector("#hekaSearchSub").textContent = items.length
      ? items.length + " produk ditemukan. Klik produk untuk langsung top up!"
      : "Tidak ada produk yang cocok. Coba kata kunci lain, misalnya: Mobile Legends, Free Fire, Pulsa, Token.";

    grid.innerHTML = items
      .map(
        (item) => `
        <div class="gameCard" data-name="${escapeHtml(item.name)}" style="cursor:pointer">
          <img src="${item.img}" alt="${escapeHtml(item.name)}">
          <a class="buttonGameCard" style="font-size:small">${escapeHtml(item.name)}</a>
        </div>
      `
      )
      .join("");

    grid.querySelectorAll(".gameCard").forEach((card, i) => {
      card.addEventListener("click", () => openProduct(items[i]));
    });

    section.hidden = false;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function doSearch(query) {
    const q = normalize(query);
    if (!q) return;
    if (IN_HTML_DIR) {
      // Halaman dalam /html/ -> kirim ke index lewat query string
      window.location.href = INDEX_URL + "?q=" + encodeURIComponent(q);
      return;
    }
    history.replaceState(null, "", "?q=" + encodeURIComponent(q) + window.location.hash);
    renderResults(q);
  }

  // ========================
  // Enhance search-bar: tombol cari + dropdown saran
  // ========================
  function enhance(input) {
    if (input.dataset.hekaSearch) return;
    input.dataset.hekaSearch = "1";

    // Pastikan input ada di dalam wrapper .heka-search-box
    let box = input.parentElement;
    if (box.classList.contains("search-box")) {
      box.classList.add("heka-search-box");
    } else if (!box.classList.contains("heka-search-box")) {
      box = document.createElement("div");
      box.className = "heka-search-box";
      input.replaceWith(box);
      box.appendChild(input);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "heka-search-btn";
    btn.setAttribute("aria-label", "Cari");
    btn.textContent = "🔍";
    box.appendChild(btn);

    const drop = document.createElement("div");
    drop.className = "heka-search-suggestions";
    box.appendChild(drop);

    let highlighted = -1;

    function closeDrop() {
      drop.classList.remove("open");
      highlighted = -1;
    }

    function currentItems() {
      return searchProducts(input.value).slice(0, 6);
    }

    function renderSuggestions() {
      const query = normalize(input.value);
      if (!query) {
        closeDrop();
        return;
      }
      const items = currentItems();
      if (!items.length) {
        drop.innerHTML = '<div class="heka-suggestion-empty">😕 Produk "<b>' + escapeHtml(query) + '</b>" tidak ditemukan</div>';
      } else {
        drop.innerHTML = items
          .map(
            (item) => `
          <div class="heka-suggestion" data-name="${escapeHtml(item.name)}">
            <img src="${item.img}" alt="${escapeHtml(item.name)}">
            <span class="heka-suggestion-name">${highlightName(item.name, query)}</span>
            <span class="heka-suggestion-cat">${escapeHtml(item.category)}</span>
          </div>
        `
          )
          .join("");
      }
      drop.classList.add("open");
    }

    input.addEventListener("input", () => {
      highlighted = -1;
      renderSuggestions();
    });
    input.addEventListener("focus", () => {
      if (normalize(input.value)) renderSuggestions();
    });
    input.addEventListener("keydown", (e) => {
      const items = currentItems();
      if (e.key === "Enter") {
        e.preventDefault();
        if (highlighted >= 0 && items[highlighted]) {
          openProduct(items[highlighted]);
        } else {
          doSearch(input.value);
        }
        closeDrop();
      } else if (e.key === "Escape") {
        closeDrop();
      } else if (drop.classList.contains("open") && items.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        highlighted =
          e.key === "ArrowDown"
            ? (highlighted + 1) % items.length
            : (highlighted - 1 + items.length) % items.length;
        drop.querySelectorAll(".heka-suggestion").forEach((el, i) => {
          el.classList.toggle("highlighted", i === highlighted);
        });
      }
    });

    drop.addEventListener("click", (e) => {
      const el = e.target.closest(".heka-suggestion");
      if (!el) return;
      const item = CATALOG.find((c) => c.name === el.dataset.name);
      if (item) openProduct(item);
      closeDrop();
    });

    btn.addEventListener("click", () => {
      doSearch(input.value);
      closeDrop();
    });

    document.addEventListener("click", (e) => {
      if (!box.contains(e.target)) closeDrop();
    });
  }

  function init() {
    const style = document.createElement("style");
    style.textContent = SEARCH_CSS;
    document.head.appendChild(style);

    document.querySelectorAll(".search-bar").forEach(enhance);

    if (!IN_HTML_DIR) {
      // Kartu "Paling Banyak Dicari" -> jalankan pencarian saat diklik
      document.querySelectorAll(".popular-games .card").forEach((card) => {
        card.addEventListener("click", () => {
          const keyword = card.textContent.trim();
          const input = document.querySelector(".search-bar");
          if (input) input.value = keyword;
          doSearch(keyword);
        });
      });

      // Dukungan ?q= dari halaman lain (mis. Enter di halaman top up)
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) {
        const input = document.querySelector(".search-bar");
        if (input) input.value = q;
        renderResults(normalize(q));
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();