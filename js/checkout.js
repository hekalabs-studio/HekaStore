// js/checkout.js
// Satu script generik untuk semua halaman topup (Free Fire, ML, Roblox,
// Pulsa, Token Listrik) — dikonfigurasi lewat window.HEKA_PAGE_CONFIG.
//
// MODE SPARK PLAN (gratis, tanpa Cloud Functions):
// Order ditulis LANGSUNG dari browser ke Firestore (koleksi `orders`).
// Supaya harga tetap tidak bisa dimanipulasi lewat DevTools walau tanpa
// Cloud Function, firestore.rules mencocokkan setiap field harga yang
// dikirim terhadap dokumen produk aslinya di server sebelum mengizinkan
// penulisan. Kalau harga tidak cocok, Firestore MENOLAK writenya sendiri
// (permission-denied) — client tidak bisa memaksakan harga palsu.

import { db, auth } from "./firebase-init.js";
import {
  collection, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const config = window.HEKA_PAGE_CONFIG;
if (!config || !config.category) {
  console.error("HEKA_PAGE_CONFIG belum diisi di halaman ini. checkout.js dihentikan.");
} else {
  init(config);
}

async function init(config) {
  const userId = document.getElementById("userId");
  const nowa = document.getElementById("nowa");
  const nopro = document.getElementById("nopro");
  // Beberapa game (mis. Mobile Legends) butuh Zone ID selain User ID.
  // Elemen ini opsional -> kalau tidak ada di halaman, cukup diabaikan.
  const zoneId = document.getElementById("zoneId");

  /* ---------- 1. Metode pembayaran ---------- */
  const paymentDefs = [
    { name: "Dana", img: "../img/wallet/dana.webp", enabled: false },
    { name: "Gopay", img: "../img/wallet/gopay.webp", enabled: false },
    { name: "OVO", img: "../img/wallet/ovo.webp", enabled: false },
    { name: "Qris", img: "../img/wallet/qris.webp", enabled: true },
  ];
  const paymentMethods = document.getElementById("EWallet");
  paymentDefs.forEach((p) => {
    const card = document.createElement("label");
    card.classList.add("payment-card");
    card.innerHTML = `
      <input type="radio" name="payment" value="${p.name}">
      <img src="${p.img}" alt="${p.name}" class="paymentLogo" style="filter: grayscale(${p.enabled ? 0 : 100}%)">
      <span>${p.name}</span>
      ${p.enabled ? "" : "<figcaption><i style='font-size: x-small'>(Dalam Pengerjaan)</i></figcaption>"}
    `;
    paymentMethods.appendChild(card);
  });

  /* ---------- 2. Ambil produk dari Firestore ---------- */
  const topupGrid = document.getElementById("topup");
  const memberGrid = document.getElementById("member");
  const memberTabBtn = document.querySelector('.tab[onclick*="member"]');

  let products = [];
  try {
    const q = query(
      collection(db, "products"),
      where("category", "==", config.category),
      where("active", "==", true)
    );
    const snap = await getDocs(q);
    products = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (err) {
    console.error("Gagal memuat produk dari Firestore:", err);
    topupGrid.innerHTML = `<p style="color:#e63946">Gagal memuat daftar produk. Muat ulang halaman.</p>`;
    return;
  }

  const topupItems = products.filter((p) => p.type === "topup");
  const memberItems = products.filter((p) => p.type === "membership");

  function renderItem(container, item) {
    const card = document.createElement("div");
    card.classList.add("item");
    card.dataset.productId = item.id;
    card._productData = item; // dipakai utk render cepat, TIDAK dipercaya saat submit (lihat langkah 5)
    card.innerHTML = `
      <h4>${item.label}</h4>
      <p style="color:#00c46b;font-size:small">${formatRupiah(item.price)}${
      item.tag ? `<figcaption style="font-size:10px;padding-top:10px;font-style:italic;">${item.tag}</figcaption>` : ""
    }</p>
    `;
    container.appendChild(card);
  }

  topupItems.forEach((item) => renderItem(topupGrid, item));
  memberItems.forEach((item) => renderItem(memberGrid, item));

  // Kalau produk ini memang tidak punya membership (Roblox/Pulsa/Listrik),
  // sembunyikan tab-nya daripada menampilkan grid kosong.
  if (memberItems.length === 0 && memberTabBtn) {
    memberTabBtn.style.display = "none";
  }

  /* ---------- 2b. Custom nominal (opsional, diaktifkan lewat HEKA_PAGE_CONFIG) ---------- */
  const customInput = document.getElementById("customNominal");
  const perkiraanEl = document.getElementById("perkiraanHarga");
  const nominalWarnEl = document.getElementById("nominalWarning");
  const customCfg = config.customNominal || null;
  let customOrder = null; // { amount, dp, price } — terisi saat input custom valid
  let nominalWarnTimer = null;

  function showNominalWarning(msg) {
    if (!nominalWarnEl) return;
    nominalWarnEl.textContent = `⚠️ ${msg}`;
    clearTimeout(nominalWarnTimer);
    nominalWarnTimer = setTimeout(() => (nominalWarnEl.textContent = ""), 3000);
  }

  if (customInput && customCfg && perkiraanEl) {
    customInput.addEventListener("input", () => {
      const raw = customInput.value;
      // Hanya angka: huruf, spasi, & karakter spesial dibuang otomatis
      const clean = raw.replace(/\D/g, "");
      if (clean !== raw) {
        customInput.value = clean;
        showNominalWarning("Hanya angka yang diperbolehkan — huruf & karakter lain dihapus.");
      }
      const n = Math.floor(Number(clean));
      if (!Number.isFinite(n) || n <= 0) {
        customOrder = null;
        perkiraanEl.classList.remove("error");
        perkiraanEl.textContent = "";
        return;
      }
      if (n < customCfg.min) {
        customOrder = null;
        perkiraanEl.classList.add("error");
        perkiraanEl.textContent = `⚠️ Minimal pembelian ${customCfg.min} ${customCfg.unit}.`;
        return;
      }
      // Formula sesuai pricelist: DP = round(nominal x 10/7), harga = nominal x pricePerUnit
      const dp = Math.round(n * customCfg.dpPerUnit);
      const price = n * customCfg.pricePerUnit;
      customOrder = { amount: n, dp, price };
      perkiraanEl.classList.remove("error");
      perkiraanEl.innerHTML =
        `<b>${n.toLocaleString("id-ID")} ${customCfg.unit} (DP ${dp.toLocaleString("id-ID")})</b> — ${formatRupiah(price)}`;
      // custom nominal dipakai -> batalkan pilihan item di grid
      document.querySelectorAll(".item.selected").forEach((i) => i.classList.remove("selected"));
    });
  }

  // Pilih item: dipasang lewat delegasi supaya jalan untuk kartu yg dirender async
  document.addEventListener("click", (e) => {
    const item = e.target.closest(".item");
    if (!item || !(topupGrid.contains(item) || memberGrid.contains(item))) return;
    document.querySelectorAll(".item").forEach((i) => i.classList.remove("selected"));
    item.classList.add("selected");
    // pilihan grid menggantikan custom nominal
    customOrder = null;
    if (customInput) customInput.value = "";
    if (perkiraanEl) {
      perkiraanEl.classList.remove("error");
      perkiraanEl.textContent = "";
    }
    if (nominalWarnEl) nominalWarnEl.textContent = "";
  });

  /* ---------- 3. Tab switcher (dipakai onclick="switchTab(...)" di HTML) ---------- */
  window.switchTab = function switchTab(tabName) {
    const tabs = document.querySelectorAll(".tab");
    const grids = document.querySelectorAll(".grid");
    tabs.forEach((t) => t.classList.remove("active"));
    grids.forEach((g) => g.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");
    tabs[tabName === "topup" ? 0 : 1]?.classList.add("active");
  };

  /* ---------- 4. Countdown invoice (tampilan saja) ---------- */
  const COUNTDOWN_DURATION = 3600;
  let expireTime = null;
  let countdown = null;

  function startCountdown() {
    expireTime = Date.now() + COUNTDOWN_DURATION * 1000;
    if (countdown) clearInterval(countdown);
    countdown = setInterval(updateTimer, 1000);
    updateTimer();
  }
  function updateTimer() {
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;
    const timeLeft = Math.floor((expireTime - Date.now()) / 1000);
    if (timeLeft <= 0) {
      timerEl.textContent = "Waktu Habis";
      clearInterval(countdown);
      return;
    }
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    timerEl.textContent = [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  /* ---------- 5. Tombol beli -> tulis order LANGSUNG ke Firestore ---------- */
  const buyButton = document.getElementById("btn-hijau");

  buyButton.addEventListener("click", async () => {
    const selected = document.querySelector(".item.selected");
    const selectedPayment = document.querySelector('input[name="payment"]:checked');

    if (!selected && !customOrder) {
      return alert("Silakan pilih nominal top up atau isi custom nominal.");
    }
    if (!selectedPayment) return alert("Silakan pilih metode pembayaran.");
    if (!userId.value) return alert("Silakan masukkan User ID.");
    if (zoneId && !zoneId.value) return alert("Silakan masukkan Zone ID.");
    if (!nowa.value) return alert("Silakan masukkan Nomor WhatsApp.");
    if (nowa.value.length < 10 || nowa.value.length > 15 || !/^\d+$/.test(nowa.value)) {
      return alert("Nomor WhatsApp tidak valid. Harap masukkan nomor yang benar.");
    }
    if (["Gopay", "OVO", "Dana"].includes(selectedPayment.value)) {
      return alert("Metode ini masih dalam pengerjaan, silakan pilih Qris atau Cash.");
    }

    buyButton.disabled = true;
    buyButton.textContent = "Memproses...";

    try {
      // --- Tentukan produk, label, dan harga ---
      let productId = null;
      let label = "";
      let basePrice = 0;
      let category = config.category;
      let isCustom = false;

      if (selected) {
        productId = selected.dataset.productId;

        // Ambil ulang harga LANGSUNG dari Firestore saat ini (bukan dari
        // grid yang mungkin sudah lama di-cache browser) supaya invoice yang
        // ditampilkan ke pembeli sudah pasti sesuai apa yang nanti disetujui
        // server. Ini bukan satu-satunya lapisan keamanan -> firestore.rules
        // tetap memvalidasi ulang persis sebelum benar-benar menyimpan.
        const productSnap = await getDoc(doc(db, "products", productId));
        if (!productSnap.exists() || productSnap.data().active === false) {
          alert("Produk ini sudah tidak tersedia. Muat ulang halaman.");
          return;
        }
        const product = productSnap.data();
        label = product.label;
        basePrice = product.price;
        category = product.category;
      } else {
        // Custom nominal: harga dihitung dari formula pricelist (lihat 2b).
        // Order TIDAK ditulis ke Firestore karena firestore.rules memvalidasi
        // harga terhadap dokumen produk (custom nominal tidak punya dokumen).
        // Pesanan custom dikonfirmasi manual ke admin via WhatsApp.
        isCustom = true;
        label = `${customOrder.amount} ${customCfg.unit} (DP ${customOrder.dp}) — Custom`;
        basePrice = customOrder.price;
      }

      let total = basePrice;
      if (selectedPayment.value === "Cash") {
        total = Math.ceil(total / 1000) * 1000; // harus sama persis dgn cashRounded() di firestore.rules
      }

      const invoiceId = generateInvoiceId();
      const currentUser = auth.currentUser;

      if (isCustom) {
        // Invoice lokal (tanpa menulis ke Firestore) + konfirmasi WhatsApp
        renderInvoice({
          invoiceId,
          total,
          label,
          orderId: "",
          paymentMethod: selectedPayment.value,
          saved: false,
        });
        startCountdown();
        return;
      }

      const orderRef = doc(collection(db, "orders"));

      const orderPayload = {
        invoiceId,
        productId,
        category,
        label,
        basePrice,
        total,
        paymentMethod: selectedPayment.value,
        userId: userId.value,
        zoneId: zoneId ? zoneId.value : null,
        nowa: nowa.value,
        promoCode: nopro && nopro.value ? nopro.value : null,
        uid: currentUser ? currentUser.uid : null, // tamu boleh checkout tanpa login
        status: "pending_confirmation",
        createdAt: serverTimestamp(),
      };

      await setDoc(orderRef, orderPayload);

      renderInvoice({
        invoiceId,
        total,
        label,
        orderId: orderRef.id,
        paymentMethod: selectedPayment.value,
        saved: true,
      });
      startCountdown();
    } catch (err) {
      console.error("Gagal membuat order:", err);
      if (err.code === "permission-denied") {
        alert("Gagal membuat order: data tidak valid (kemungkinan harga produk sudah berubah). Muat ulang halaman lalu coba lagi.");
      } else {
        alert("Gagal membuat order: " + (err.message || "Terjadi kesalahan, coba lagi."));
      }
    } finally {
      buyButton.disabled = false;
      buyButton.textContent = "Lanjutkan Pembelian";
    }
  });

  function renderInvoice({ invoiceId, total, label, orderId, paymentMethod, saved = true }) {
    document.getElementById("invoice-id").textContent = invoiceId;

    const dataPesanan = document.getElementById("dataPesanan");
    let loginNote;
    if (!saved) {
      // Custom nominal: order tidak masuk Firestore -> dikonfirmasi manual
      loginNote = `<p style="font-size:.85rem;color:#b26a00;">⚠️ Nominal custom dikonfirmasi manual oleh admin via WhatsApp.</p>`;
    } else {
      loginNote = auth.currentUser
        ? `<p style="font-size:.85rem;color:#0eb193;">✅ Tersimpan di <a href="${profileUrl()}" style="color:#0eb193;">Riwayat Transaksi</a> akunmu.</p>`
        : `<p style="font-size:.85rem;color:#888;">Login supaya transaksi ini tercatat di riwayat akunmu & dapat poin.</p>`;
    }
    dataPesanan.innerHTML = `
      <p><strong>Produk:</strong> ${label}</p>
      <p><strong>Metode:</strong> ${paymentMethod}</p>
      <p><strong>User ID:</strong> ${userId.value}${zoneId ? " (" + zoneId.value + ")" : ""}</p>
      <p><strong>Kode Promo:</strong> ${nopro && nopro.value ? nopro.value : "-"}</p>
      <p><strong>Total Bayar:</strong> ${formatRupiah(total)}</p>
      <p><strong>Invoice:</strong> ${invoiceId}</p>
      ${loginNote}
    `;

    renderPaymentOrder(paymentMethod, total);

    const inputData = document.querySelectorAll("#formUserId, #pilihNominal, #metodePembayaran, #dataPemesan, #deskripsiLayanan");
    inputData.forEach((s) => (s.style.display = "none"));
    const orderedSection = document.getElementById("ordered");
    orderedSection.style.display = "block";
    orderedSection.scrollIntoView({ behavior: "smooth", block: "start" });

    const konfirmasiEl = document.getElementById("konfirmasiAdmin");
    if (orderId) {
      konfirmasiEl.dataset.orderId = orderId;
    } else {
      delete konfirmasiEl.dataset.orderId;
    }
    konfirmasiEl.dataset.invoiceId = invoiceId;
    konfirmasiEl.dataset.total = total;
    konfirmasiEl.dataset.label = label;
  }

  function profileUrl() {
    // checkout.js dipakai baik di root (tidak ada) maupun di html/*.html
    return window.location.pathname.includes("/html/") ? "../profile.html" : "profile.html";
  }

  const orderData = [
    { name: "Qris", img: "../img/QRISpay.webp" },
    { name: "Cash", img: "../img/wallet/cash.webp" },
  ];
  const paymentOrder = document.getElementById("paymentOrdered");

  function renderPaymentOrder(method, total) {
    const data = orderData.find((d) => d.name.toLowerCase() === method.toLowerCase());
    if (!paymentOrder || !data) return;
    const noteQR =
      method === "Cash"
        ? `<p><i>*Catatan: Silakan konfirmasi pembayaran dengan klik "Konfirmasi ke Admin" di bawah.</i></p>`
        : `<button class="download-btn">Unduh QR Code</button><br /><br />
           <figcaption><i><b>*Catatan:</b><br/> Setelah membayar, kirim screenshot bukti pembayaran lewat "Konfirmasi ke Admin" di bawah.</i></figcaption>`;
    paymentOrder.innerHTML = `
      <h3>Pembayaran</h3>
      <p>${data.name}</p>
      <br />
      <img src="${data.img}" class="qris-img" alt="${data.name}" style="border-radius:20px" /> <br />
      <p class="total" id="totalPembayaran">Total Pembayaran: <b>${formatRupiah(total)}</b></p>
      <br />
      ${noteQR}
    `;
  }

  /* ---------- 6. Konfirmasi ke Admin (buka WhatsApp) ---------- */
  const konfirmasiBtn = document.getElementById("konfirmasiAdmin");
  konfirmasiBtn.addEventListener("click", () => {
    const invoiceId = konfirmasiBtn.dataset.invoiceId || "";
    const total = konfirmasiBtn.dataset.total || "";
    const selected = document.querySelector(".item.selected");
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    const produk = selected
      ? selected.querySelector("h4").innerText
      : konfirmasiBtn.dataset.label || "";
    const metode = selectedPayment ? selectedPayment.value : "";
    const waNumber = config.waNumber || "6289514433486";

    const url =
      `https://wa.me/${waNumber}?text=` +
      `Saya ingin top up ${encodeURIComponent(config.serviceName)} dengan nominal *${encodeURIComponent(produk)}*` +
      `%0Amenggunakan metode pembayaran *${encodeURIComponent(metode)}*.` +
      `%0AInvoice: *${encodeURIComponent(invoiceId)}*` +
      `%0AUser ID: *${encodeURIComponent(userId.value)}${zoneId ? " (" + encodeURIComponent(zoneId.value) + ")" : ""}*` +
      `%0ANomor WhatsApp: *${encodeURIComponent(nowa.value)}*` +
      `%0AKode Promo: *${encodeURIComponent(nopro && nopro.value ? nopro.value : "tidak ada")}*.` +
      `%0A*Total Pembayaran: ${encodeURIComponent(formatRupiah(Number(total)))}*` +
      `%0A%0A"Segera di isi ya minn ^^"`;

    window.location.href = url;
  });

  /* ---------- 7. Unduh QR ---------- */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(".download-btn");
    if (!btn) return;
    const qrisImg = document.querySelector(".qris-img");
    if (!qrisImg || !qrisImg.src) return alert("Gagal: gambar QR tidak ditemukan.");
    try {
      const res = await fetch(qrisImg.src);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1]) || "webp";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `QrisHekaapedia.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      window.open(qrisImg.src, "_blank");
    }
  });
}

function generateInvoiceId() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HKA${rand}E`;
}

function formatRupiah(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return "";
  return "Rp " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
