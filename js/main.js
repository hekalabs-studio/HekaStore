// Games
const games = [
  { name: "Mobile Legends", img: "./img/games/logoml.webp", link: "html/mobileLegend.html" },
  { name: "Free Fire", img: "./img/games/logoff.webp", link: "html/freefire.html" },
  { name: "Roblox", img: "./img/games/roblox.webp", link: "html/roblox.html" },
  { name: "PUBG Mobile", img: "./img/games/pubg.webp", link: "" },
  { name: "Genshin Impact", img: "./img/games/logo-genshin.webp", link: "" },
  { name: "Call of Duty Mobile", img: "./img/games/logocod.webp", link: "" },
  { name: "Sausage Man", img: "./img/games/sausageman.webp", link: ""},
  { name: "Super Sus", img: "./img/games/supersus.webp", link: ""}
];
//pulsa
const pulsa = [
  {name: "Telkomsel", img: "./img/pulsa/telkomsel.webp", link: "html/PulsaTelkomsel.html" },
  {name: "Three", img: "./img/pulsa/tri.webp", link: "html/pulsaTri.html" },
  {name: "Indosat", img: "./img/pulsa/indosat.webp", link: "html/pulsaIndosat.html" },
  {name: "XL", img: "./img/pulsa/xl.webp", link: "html/pulsaXL.html" },
]
const listrik = {name : "Listrik", img: "./img/logopln.webp", link : "html/tokenListrik.html"}

const listGrid = document.getElementById("listGrid");
// GAMES
games.forEach(game => {
  const card = document.createElement("div");
  card.classList.add("gameCard");
  card.innerHTML = `
    <img src="${game.img}" alt="${game.name}">
    <a class="buttonGameCard" href="${game.link}" style="font-size: small">${game.name}</a>
  `;
  listGrid.appendChild(card);
});
// PULSA
pulsa.forEach(pulsa => {
  const card = document.createElement("div");
  card.classList.add("pulsaCard");
  card.innerHTML = `
    <img src="${pulsa.img}" alt="${pulsa.name}">
    <a class="buttonGameCard" href="${pulsa.link}" style="font-size: small">${pulsa.name}</a>
  `;
  listGrid.appendChild(card);
});
// LISTRIK
  const card = document.createElement("div");
  card.classList.add("listrikCard");
  card.innerHTML = `
    <img src="${listrik.img}" alt="${listrik.name}">
    <a class="buttonGameCard" href="${listrik.link}" style="font-size: small">${listrik.name}</a>
  `;
  listGrid.appendChild(card);


  //ChooseBuy
  // PENTING: koleksi kartu di-scope ke dalam #listGrid, BUKAN seluruh dokumen.
  // Kartu hasil pencarian (js/search.js) juga memakai class "gameCard" di section
  // terpisah di atas daftar produk. Kalau di-query global, live HTMLCollection
  // ikut menghitung kartu hasil pencarian sehingga index bergeser dan kartu game
  // terakhir (Super Sus) tidak ikut tersembunyi di tab Pulsa / Token Listrik.
  const choose = [document.getElementById("games"), document.getElementById("pulsa"), document.getElementById("listrik")];
  const listJudul = document.getElementById("listJudul");
  const gamesCard = listGrid.getElementsByClassName("gameCard");
  const pulsaCard = listGrid.getElementsByClassName("pulsaCard");
  const listrikCard = listGrid.getElementsByClassName("listrikCard");

  // Judul & pemilihan tab. Loop TIDAK memakai jumlah hardcoded (8 game / 4 pulsa)
  // supaya tab tetap benar walau jumlah produk di array di atas ditambah.
  const TAB_TITLES = ["🎮 Games", "📱 Pulsa", "⚡ Token Listrik"];

  function selectTab(activeIndex) {
    [gamesCard, pulsaCard, listrikCard].forEach((cards, groupIndex) => {
      const display = groupIndex === activeIndex ? "block" : "none";
      for (const card of cards) {
        card.style.display = display;
      }
    });
    choose.forEach((btn, i) => {
      const active = i === activeIndex;
      btn.style.background = active ? "linear-gradient(0deg,#0eb193,#2ed9b3)" : "#dfdfdf";
      btn.style.color = active ? "#f5f5f5" : "black";
    });
    listJudul.innerHTML = TAB_TITLES[activeIndex];
  }

  choose[0].addEventListener("click", () => selectTab(0));
  choose[1].addEventListener("click", () => selectTab(1));
  choose[2].addEventListener("click", () => selectTab(2));

  // footer
  // Contoh: animasi hover untuk ikon sosial
document.querySelectorAll(".social-icons img").forEach(icon => {
    icon.addEventListener("mouseover", () => {
        icon.style.transform = "scale(1.15)";
        icon.style.transition = "0.2s";
        icon.style.cursor = "pointer";
    });
    icon.addEventListener("mouseout", () => {
        icon.style.transform = "scale(1)";
    });
});

// ========================
// Banner Slider
// ========================
const banners = [
  {
    img: "./img/banner/desain-main.webp",
    title: "Top Up Game & Pulsa",
    subtitle: "Harga termurah, proses cepat, dan aman.",
    btnText: "Lihat Layanan",
    btnLink: "#listJudul",
  },
  {
    img: "./img/banner/bannerml.webp",
    title: "Promo Diamond Game",
    subtitle: "Diskon khusus untuk pembelian pertama.",
    btnText: "Daftar Sekarang",
    btnLink: "#",
  },
  {
    img: "./img/banner/bannerRoblox.jpg",
    title: "Pulsa & Token Listrik",
    subtitle: "Mudah, cepat, dan bisa dipakai sehari-hari.",
    btnText: "Beli Sekarang",
    btnLink: "#listJudul",
  },
  {
    img: "./img/banner/bannerff.webp",
    title: "Diamond & Membership Game",
    subtitle: "Mudah, cepat, dan banyak promonya",
    btnText: "Beli Sekarang",
    btnLink: "#listJudul",
  },
  {
    gradient: "linear-gradient(135deg, #0c937b 0%, #0eb193 45%, #2ed9b3 100%)",
    icon: "🛠️",
    title: "Jasa Digital HekaLabs Studio",
    subtitle: "Website, UI/UX, edit video, IoT — kerjakan proyekmu sekarang.",
    btnText: "Pesan Jasa",
    btnLink: "html/jasaDigital.html",
  },
];

function initBannerSlider() {
  const slidesContainer = document.getElementById("bannerSlides");
  const dotsContainer = document.getElementById("bannerDots");
  const prevBtn = document.getElementById("bannerPrev");
  const nextBtn = document.getElementById("bannerNext");
  if (!slidesContainer || !dotsContainer) return;

  let currentIndex = 0;
  let intervalId = null;
  let isHovering = false;

  // Preload gambar banner agar slide berikutnya tidak sempat tampil kosong/putar lagi.
  banners.forEach((b) => {
    if (!b.img) return;
    const preloader = new Image();
    preloader.src = b.img;
  });

  function render() {
    slidesContainer.innerHTML = banners
      .map(
        (b, i) => `
      <div class="banner-slide ${i === 0 ? 'active' : ''}" style="${
        b.gradient ? "background:" + b.gradient : "background-image:url('" + b.img + "')"
      }">
        <div class="banner-text">
          <h2>${b.icon ? b.icon + " " : ""}${b.title}</h2>
          <p>${b.subtitle}</p>
          <a class="btn" href="${b.btnLink}" style="color:#0c937b;text-decoration:none;display:inline-block;">${b.btnText}</a>
        </div>
      </div>
    `
      )
      .join("");

    dotsContainer.innerHTML = banners
      .map(
        (_, i) => `
      <button class="banner-dot ${i === 0 ? 'active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>
    `
      )
      .join("");
  }

  function update() {
    slidesContainer.querySelectorAll(".banner-slide").forEach((slide, i) => {
      slide.classList.toggle("active", i === currentIndex);
    });
    dotsContainer.querySelectorAll(".banner-dot").forEach((dot, i) => {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  function goTo(index) {
    const nextIndex = (index + banners.length) % banners.length;
    currentIndex = nextIndex;
    update();
    resetInterval();
  }

  function next() {
    goTo(currentIndex + 1);
  }

  function prev() {
    goTo(currentIndex - 1);
  }

  function resetInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (isHovering) return;
    intervalId = setInterval(next, 5000);
  }

  dotsContainer.addEventListener("click", (e) => {
    const dot = e.target.closest(".banner-dot");
    if (!dot) return;
    const index = Number(dot.dataset.index);
    if (Number.isFinite(index)) goTo(index);
  });

  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);

  // Jeda autoplay saat kursor berada di banner, supaya user bisa membaca/klik CTA.
  const sliderEl = document.getElementById("bannerSlider");
  if (sliderEl) {
    sliderEl.addEventListener("mouseenter", () => {
      isHovering = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    });
    sliderEl.addEventListener("mouseleave", () => {
      isHovering = false;
      resetInterval();
    });
  }

  render();
  update();
  resetInterval();
}

initBannerSlider();

// ========================
// Quick Links (header) -> sinkron dengan tab kategori list
// ========================
document.querySelectorAll(".quick-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".quick-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    // Link dengan data-category (games/pulsa/listrik) men-switch tab daftar produk
    const categoryBtn = document.getElementById(link.dataset.category || "");
    if (categoryBtn) categoryBtn.click();
  });
});
