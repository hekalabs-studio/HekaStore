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
import { openModal } from "./auth-ui.js";
import {
  collection, doc, setDoc, getDoc, query, where, getDocs, serverTimestamp, onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

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
  let orderStatusUnsub = null; // listener status order (dilepas saat selesai/gagal)

  function startCountdown() {
    expireTime = Date.now() + COUNTDOWN_DURATION * 1000;
    if (countdown) clearInterval(countdown);
    countdown = setInterval(updateTimer, 1000);
    updateTimer();
  }
  function updateTimer() {
    const timerEl = document.getElementById("timer");
    if (!timerEl) return;
    const box = timerEl.closest(".timer-box");
    const timeLeft = Math.floor((expireTime - Date.now()) / 1000);
    if (timeLeft <= 0) {
      timerEl.textContent = "Waktu Habis";
      if (box) {
        box.classList.remove("warn");
        box.classList.add("danger");
        box.style.setProperty("--p", "0%");
      }
      clearInterval(countdown);
      return;
    }
    // Progress bar + warna urgensi (hijau > 10 menit, kuning ≤ 10, merah ≤ 2)
    if (box) {
      const pct = Math.max(0, Math.min(100, (timeLeft / COUNTDOWN_DURATION) * 100));
      box.style.setProperty("--p", pct.toFixed(1) + "%");
      box.classList.toggle("warn", timeLeft <= 600 && timeLeft > 120);
      box.classList.toggle("danger", timeLeft <= 120);
    }
    const h = Math.floor(timeLeft / 3600);
    const m = Math.floor((timeLeft % 3600) / 60);
    const s = timeLeft % 60;
    timerEl.textContent = [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  }

  /* ---------- 5. Tombol beli -> tulis order LANGSUNG ke Firestore ---------- */
  const buyButton = document.getElementById("btn-hijau");
  let pendingResume = false; // true = user sedang diminta login, setelah login pembelian dilanjutkan otomatis
  let pendingResumeAt = 0;

  // Banner kecil di kartu data pemesan: mengingatkan wajib login / menampilkan akun aktif.
  function ensureLoginGateHint() {
    if (document.getElementById("loginGateHint")) return;
    const card = buyButton.closest(".card");
    if (!card) return;
    const hint = document.createElement("div");
    hint.id = "loginGateHint";
    hint.addEventListener("click", (e) => {
      if (e.target.closest(".gate-login-btn")) {
        openModal("login", "Silakan <b>Login / Daftar</b> dulu untuk melanjutkan pembelian.");
      }
    });
    buyButton.insertAdjacentElement("beforebegin", hint);
    if (!document.getElementById("loginGateStyles")) {
      const st = document.createElement("style");
      st.id = "loginGateStyles";
      st.textContent = `
        #loginGateHint{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:12px 0 4px;padding:11px 14px;border-radius:10px;font-size:.86rem;background:#fff9ec;border:1.5px solid #f0d9a0;color:#8a5a00}
        #loginGateHint.ok{background:#e6f9f3;border-color:#b5e8d9;color:#0b7a63}
        #loginGateHint .gate-login-btn{margin-left:auto;border:none;border-radius:8px;padding:7px 14px;font-weight:700;font-size:.82rem;cursor:pointer;color:#fff;background:linear-gradient(0deg,#0eb193,#2ed9b3);font-family:inherit}
        #loginGateHint .gate-login-btn:hover{filter:brightness(1.06)}
      `;
      document.head.appendChild(st);
    }
  }
  function updateLoginGateHint(user) {
    ensureLoginGateHint();
    const hint = document.getElementById("loginGateHint");
    if (!hint) return;
    if (user) {
      hint.classList.add("ok");
      hint.innerHTML = `✅ Membeli sebagai <b>${user.displayName || user.email}</b> — transaksi otomatis tercatat di <b>Riwayat Transaksi</b> akunmu.`;
    } else {
      hint.classList.remove("ok");
      hint.innerHTML = `🔒 Pembelian wajib <b>login / daftar</b> dulu supaya transaksimu terdata &amp; masuk riwayat. <button type="button" class="gate-login-btn">Login / Daftar</button>`;
    }
  }
  updateLoginGateHint(auth.currentUser);
  onAuthStateChanged(auth, (user) => {
    updateLoginGateHint(user);
    // Setelah berhasil login/daftar dari gate, lanjutkan proses pembelian
    // otomatis (maks. 3 menit setelah tombol beli diklik).
    if (user && pendingResume && Date.now() - pendingResumeAt < 180000) {
      pendingResume = false;
      handlePurchase();
    }
  });

  async function handlePurchase() {
    // ===== WAJIB LOGIN =====
    // Order selalu terkait akun pemiliknya: pendataan & riwayat transaksi
    // berfungsi. firestore.rules juga menolak order tanpa uid (lapisan ke-2
    // di server, jadi tetap aman walau script ini diubah lewat DevTools).
    const me = auth.currentUser;
    if (!me) {
      pendingResume = true;
      pendingResumeAt = Date.now();
      openModal("login", `Silakan <b>Login / Daftar</b> dulu untuk melanjutkan pembelian.<br>Setelah login, pesananmu <b>otomatis dilanjutkan</b> &amp; tercatat di riwayat.`);
      return;
    }

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
        uid: me.uid, // wajib login (divalidasi ulang oleh firestore.rules)
        userEmail: me.email || "",
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
  }

  buyButton.addEventListener("click", handlePurchase);

  function renderInvoice({ invoiceId, total, label, orderId, paymentMethod, saved = true }) {
    injectInvoiceEnhancements();
    document.getElementById("invoice-id").textContent = invoiceId;
    const copyChip = document.querySelector("#invoice-id .copy-chip");
    if (copyChip) copyChip.dataset.copy = invoiceId;

    // Tanggal transaksi asli saat invoice dibuat (menggantikan teks statis di HTML)
    const dateEl = document.querySelector("#ordered .date");
    if (dateEl) dateEl.textContent = "Tanggal Transaksi: " + nowStamp();

    const dataPesanan = document.getElementById("dataPesanan");
    const uidValue = `${userId.value}${zoneId ? " (" + zoneId.value + ")" : ""}`;
    const me = auth.currentUser;
    const akunRow = me
      ? `<div class="row"><span class="k">Akun</span><span class="v">${me.email || me.displayName || me.uid}</span></div>`
      : "";
    let loginNote;
    if (!saved) {
      // Custom nominal: order tidak masuk Firestore -> dikonfirmasi manual
      loginNote = `<div class="mini-note warn">⚠️ Nominal custom dikonfirmasi manual oleh admin via WhatsApp.</div>`;
    } else {
      loginNote = `<div class="mini-note ok">✅ Tersimpan di <a href="${profileUrl()}">Riwayat Transaksi</a> akunmu. Status berubah jadi <b>Selesai</b> otomatis setelah admin memverifikasi (poin loyalti ikut masuk).</div>`;
    }
    dataPesanan.innerHTML = `
      <div class="row"><span class="k">Produk</span><span class="v">${label}</span></div>
      <div class="row"><span class="k">Metode</span><span class="v">${paymentMethod}</span></div>
      ${akunRow}
      <div class="row"><span class="k">User ID</span><span class="v">${uidValue}<button class="copy-mini" data-copy="${uidValue}" title="Salin User ID">📋</button></span></div>
      <div class="row"><span class="k">Kode Promo</span><span class="v">${nopro && nopro.value ? nopro.value : "—"}</span></div>
      <div class="row"><span class="k">Invoice</span><span class="v">${invoiceId}<button class="copy-mini" data-copy="${invoiceId}" title="Salin ID Invoice">📋</button></span></div>
      <div class="row total-row"><span class="k">Total Bayar</span><span class="v">${formatRupiah(total)}</span></div>
      ${loginNote}
    `;

    renderPaymentOrder(paymentMethod, total);

    const inputData = document.querySelectorAll("#formUserId, #pilihNominal, #metodePembayaran, #dataPemesan, #deskripsiLayanan");
    inputData.forEach((s) => (s.style.display = "none"));
    const orderedSection = document.getElementById("ordered");
    orderedSection.classList.add("revealed");
    orderedSection.style.display = "block";
    orderedSection.scrollIntoView({ behavior: "smooth", block: "start" });

    const konfirmasiEl = document.getElementById("konfirmasiAdmin");
    if (orderId) {
      konfirmasiEl.dataset.orderId = orderId;
      watchOrderStatus(orderId); // pantau status -> tampilkan "Selesai" begitu admin verify
    } else {
      delete konfirmasiEl.dataset.orderId;
    }
    konfirmasiEl.dataset.invoiceId = invoiceId;
    konfirmasiEl.dataset.total = total;
    konfirmasiEl.dataset.label = label;
  }

  /* ---------- 5b. Pantau status order real-time -> indikator "Selesai" ---------- */
  // Begitu admin klik Verify di email (status order jadi "completed" via
  // backend Apps Script), halaman pembayaran ini otomatis menampilkan
  // banner "Done ✅ Pesanan Selesai" TANPA perlu refresh.
  // Catatan: firestore.rules hanya mengizinkan PEMILIK order (yang login)
  // membaca dokumen order-nya. Jadi listener ini hanya dipasang untuk user
  // login; tamu (checkout tanpa akun) tidak bisa membaca balik -> dilewati.
  function watchOrderStatus(orderId) {
    if (!orderId || !auth.currentUser) return;
    if (orderStatusUnsub) { orderStatusUnsub(); orderStatusUnsub = null; }

    const banner = ensureStatusBanner();
    setStatusBanner(banner, "pending_confirmation");

    orderStatusUnsub = onSnapshot(
      doc(db, "orders", orderId),
      (snap) => {
        const status = snap.exists() ? snap.data().status : null;
        setStatusBanner(banner, status);
        if (status === "completed" || status === "failed") {
          if (countdown) clearInterval(countdown);
          const timerEl = document.getElementById("timer");
          if (timerEl) {
            timerEl.textContent = status === "completed" ? "Selesai ✓" : "Dibatalkan";
            const tbox = timerEl.closest(".timer-box");
            if (tbox) tbox.classList.remove("warn", "danger");
          }
          const tab = document.querySelector("#ordered .tabs .tab");
          if (tab) {
            tab.textContent = status === "completed" ? "Selesai" : "Gagal";
            tab.classList.toggle("tab--done", status === "completed");
            tab.classList.toggle("tab--failed", status === "failed");
          }
          if (orderStatusUnsub) { orderStatusUnsub(); orderStatusUnsub = null; }
        }
      },
      (err) => {
        // Mis. permission-denied kalau bukan pemilik. Diamkan saja (banner
        // pending tetap tampil); jangan ganggu user dengan alert.
        console.warn("Listener status order berhenti:", err && err.code ? err.code : err);
      }
    );
  }

  function ensureStatusBanner() {
    let el = document.getElementById("orderStatusBanner");
    if (el) return el;
    el = document.createElement("div");
    el.id = "orderStatusBanner";
    const box = document.querySelector("#ordered .invoice-box");
    if (box) box.insertBefore(el, box.firstChild);
    else {
      const ordered = document.getElementById("ordered");
      if (ordered) ordered.appendChild(el);
    }
    return el;
  }

  function setStatusBanner(el, status) {
    if (!el) return;
    el.classList.remove("st-pending", "st-done", "st-failed");
    if (status === "completed") {
      el.classList.add("st-done");
      el.innerHTML =
        "✅ <b>Done — Pesanan Selesai!</b> Pesananmu sudah diverifikasi admin. " +
        "Poin loyalti otomatis masuk saat kamu membuka halaman Profil.";
      updateStepper("completed");
      burstConfetti();
    } else if (status === "failed") {
      el.classList.add("st-failed");
      el.innerHTML =
        "❌ <b>Pesanan ditandai gagal</b> oleh admin. Silakan hubungi admin lewat " +
        'tombol "Konfirmasi ke Admin" di bawah.';
      updateStepper("failed");
    } else {
      el.classList.add("st-pending");
      el.innerHTML =
        "⏳ <b>Menunggu verifikasi admin.</b> Setelah pembayaran dicek & pesanan diproses, " +
        "status di sini otomatis berubah jadi <b>Selesai ✅</b> — tidak perlu refresh halaman.";
      updateStepper("pending");
    }
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
    const methodChip = `<span class="pay-method">${data.name}</span>`;
    if (method.toLowerCase() === "cash") {
      paymentOrder.innerHTML = `
        <h3>Pembayaran</h3><br />
        ${methodChip}
        <div class="pay-note"><b>*Catatan:</b> Bayar langsung dengan uang tunai, lalu klik "Konfirmasi ke Admin" di bawah supaya pesananmu segera diproses.</div>
      `;
      return;
    }
    paymentOrder.innerHTML = `
      <h3>Pembayaran</h3><br />
      ${methodChip}
      <img src="${data.img}" class="qris-img" alt="QR ${data.name}" />
      <p class="total" id="totalPembayaran">Total Pembayaran<b>${formatRupiah(total)}</b></p>
      <button class="download-btn">Unduh QR Code</button>
      <div class="pay-note"><b>*Catatan:</b> Setelah membayar, kirim screenshot bukti pembayaran lewat "Konfirmasi ke Admin" di bawah.</div>
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

/* ============================================================
   Helper tampilan invoice modern (dipakai dari dalam init())
   ============================================================ */

// Tanggal & jam saat ini dalam format "YYYY-MM-DD HH:MM:SS"
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

let toastTimer = null;
function showToast(msg) {
  let t = document.getElementById("hekaToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "hekaToast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}

async function copyText(text, okMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(okMsg || "Tersalin ke clipboard ✓");
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      showToast(okMsg || "Tersalin ke clipboard ✓");
      return true;
    } catch {
      showToast("Gagal menyalin 😅");
      return false;
    }
  }
}

// Satu listener global untuk semua tombol copy (chip & mini)
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy-mini, .copy-chip");
  if (!btn) return;
  const text = btn.dataset.copy;
  if (!text) return;
  const ok = await copyText(text, btn.classList.contains("copy-chip") ? "ID Invoice tersalin ✓" : "User ID tersalin ✓");
  if (ok && btn.classList.contains("copy-chip")) {
    const orig = btn.textContent;
    btn.textContent = "✓ Tersalin";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove("copied");
    }, 1600);
  }
});

// Sisipkan elemen interaktif sekali saja saat invoice pertama kali tampil
function injectInvoiceEnhancements() {
  const box = document.querySelector("#ordered .invoice-box");
  if (!box || box.dataset.enhanced) return;
  box.dataset.enhanced = "1";

  // 1. Stepper status: Pesanan Dibuat -> Verifikasi Admin -> Selesai
  const topInfo = box.querySelector(".top-info");
  if (topInfo && !box.querySelector(".order-stepper")) {
    const st = document.createElement("div");
    st.className = "order-stepper";
    st.innerHTML = `
      <div class="step is-done"><div class="dot">✓</div><div class="lbl">Pesanan Dibuat</div></div>
      <div class="step is-active"><div class="dot">2</div><div class="lbl">Verifikasi Admin</div></div>
      <div class="step"><div class="dot">3</div><div class="lbl">Selesai</div></div>
    `;
    topInfo.insertAdjacentElement("afterend", st);
  }

  // 2. Tombol copy di samping ID invoice
  const invId = box.querySelector("#invoice-id");
  if (invId && !invId.querySelector(".copy-chip")) {
    const btn = document.createElement("button");
    btn.className = "copy-chip";
    btn.textContent = "Copy";
    btn.title = "Salin ID Invoice";
    invId.appendChild(btn);
  }

  // 3. Progress bar di bawah timer
  const timerBox = box.querySelector(".timer-box");
  if (timerBox && !timerBox.querySelector(".timer-progress")) {
    const bar = document.createElement("div");
    bar.className = "timer-progress";
    timerBox.appendChild(bar);
  }

  // 4. Tombol cetak / simpan PDF di header invoice
  const header = document.querySelector("#ordered .invoice-header");
  if (header && !header.querySelector(".print-btn")) {
    const p = document.createElement("button");
    p.className = "print-btn";
    p.textContent = "Cetak / PDF";
    p.addEventListener("click", () => window.print());
    header.appendChild(p);
  }

  updateStepper("pending");
}

function updateStepper(status) {
  const stepper = document.querySelector("#ordered .order-stepper");
  if (!stepper) return;
  const steps = stepper.querySelectorAll(".step");
  if (status === "completed") {
    stepper.classList.remove("is-error");
    steps.forEach((s) => {
      s.classList.remove("is-active");
      s.classList.add("is-done");
      const dot = s.querySelector(".dot");
      if (dot) dot.textContent = "✓";
    });
  } else if (status === "failed") {
    stepper.classList.add("is-error");
    steps.forEach((s) => s.classList.remove("is-done", "is-active"));
  } else {
    stepper.classList.remove("is-error");
    steps.forEach((s, i) => {
      s.classList.remove("is-done", "is-active");
      if (i === 0) s.classList.add("is-done");
      if (i === 1) s.classList.add("is-active");
    });
  }
}

// Hujan confetti singkat di dalam kotak invoice saat pesanan selesai
function burstConfetti() {
  const box = document.querySelector("#ordered .invoice-box");
  if (!box || box.querySelector(".confetti")) return;
  const wrap = document.createElement("div");
  wrap.className = "confetti";
  const colors = ["#2ed9b3", "#ffd94a", "#0eb193", "#7ad7bf", "#f7b733", "#8ef0d6"];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement("i");
    p.style.setProperty("--x", (Math.random() * 100).toFixed(1) + "%");
    p.style.setProperty("--c", colors[i % colors.length]);
    p.style.setProperty("--d", (1.8 + Math.random() * 1.6).toFixed(2) + "s");
    p.style.setProperty("--dl", (Math.random() * 0.5).toFixed(2) + "s");
    p.style.setProperty("--cx", (Math.random() * 120 - 60).toFixed(0) + "px");
    p.style.setProperty("--cr", Math.round(360 + Math.random() * 540) + "deg");
    wrap.appendChild(p);
  }
  box.appendChild(wrap);
  setTimeout(() => wrap.remove(), 4500);
}
