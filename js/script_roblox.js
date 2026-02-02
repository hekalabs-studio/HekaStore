const userId = document.getElementById("userId");
const nowa = document.getElementById("nowa");
const nopro = document.getElementById("nopro");
const custom = document.getElementById("customNominal")

// Daftar metode pembayaran dan gambar terkait
const payment = [
   {name :"Dana",img : "../img/wallet/dana.webp"},
   {name :"Gopay",img : "../img/wallet/gopay.jpg"},
   {name :"OVO",img : "../img/wallet/ovo.webp"},
   {name :"Qris",img : "../img/wallet/qris.png"},
]


const paymentMethods = document.getElementById("EWallet");
payment.forEach(payment => {
   const card = document.createElement("label")
   card.classList.add("payment-card")
   const isDisabled = [
    payment.name !== "Qris" ? "disabled" : "",
     payment.name !== "Qris" ? 'style="filter: grayscale(100%)"' : 'style="filter: grayscale(0)"',
      payment.name !== "Qris" ? "<figcaption><i style='font-size: x-small'>(Dalam Pengerjaan)</i></figcaption>": ""
    ];

   card.innerHTML = `
      <input type="radio" name="payment" value="${payment.name}">
      <img src="${payment.img}" alt="${payment.name}" class="paymentLogo" ${isDisabled[1]}>
      <span>${payment.name}</span>
      ${isDisabled[2]}
   `
   paymentMethods.appendChild(card);
});

// Helper: ubah string Rupiah ke angka dan sebaliknya
function parseRupiahToNumber(str) {
    if (!str) return 0;
    // hapus semua karakter bukan angka
    const digits = String(str).replace(/[^0-9]/g, '');
    return digits ? Number(digits) : 0;
}

function formatRupiah(num) {
    if (num == null) return '';
    const n = Number(num);
    if (!Number.isFinite(n)) return '';
    return 'Rp ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
const topupDiamond = document.getElementById("topup");
const buyDiamond = [
    {name: "Top Up Roblox", price: "Rp 7.500", diamond: "50 Robux", DP: "(DP 71)"},
    {name: "Top Up Roblox", price: "Rp 11.250", diamond: "75 Robux", DP: "(DP 107)"},
    {name: "Top Up Roblox", price: "Rp 15.000", diamond: "100 Robux", DP: "(DP 143)"},
    {name: "Top Up Roblox", price: "Rp 18.750", diamond: "125 Robux", DP: "(DP 179)"},
    {name: "Top Up Roblox", price: "Rp 24.000", diamond: "160 Robux", DP: "(DP 229)"},
    {name: "Top Up Roblox", price: "Rp 30.000", diamond: "200 Robux", DP: "(DP 286)"},
    {name: "Top Up Roblox", price: "Rp 37.500", diamond: "250 Robux", DP: "(DP 357)"},
    {name: "Top Up Roblox", price: "Rp 45.000", diamond: "300 Robux", DP: "(DP 429)"},
    {name: "Top Up Roblox", price: "Rp 48.000", diamond: "320 Robux", DP: "(DP 457)"},
    {name: "Top Up Roblox", price: "Rp 52.500", diamond: "350 Robux", DP: "(DP 500)"},
    {name: "Top Up Roblox", price: "Rp 63.000", diamond: "420 Robux", DP: "(DP 600)"},
    {name: "Top Up Roblox", price: "Rp 75.000", diamond: "500 Robux", DP: "(DP 714)"},
    {name: "Top Up Roblox", price: "Rp 78.750", diamond: "525 Robux", DP: "(DP 750)"},
    {name: "Top Up Roblox", price: "Rp 82.500", diamond: "550 Robux", DP: "(DP 786)"},
    {name: "Top Up Roblox", price: "Rp 90.000", diamond: "600 Robux", DP: "(DP 857)"},
    {name: "Top Up Roblox", price: "Rp 97.500", diamond: "650 Robux", DP: "(DP 929)"},
    {name: "Top Up Roblox", price: "Rp 105.000", diamond: "700 Robux", DP: "(DP 1.000)"},
    {name: "Top Up Roblox", price: "Rp 112.500", diamond: "750 Robux", DP: "(DP 1.071)"},
    {name: "Top Up Roblox", price: "Rp 150.000", diamond: "1.000 Robux", DP: "(DP 1.429)"},
    {name: "Top Up Roblox", price: "Rp 195.000", diamond: "1.300 Robux", DP: "(DP 1.857)"},
    {name: "Top Up Roblox", price: "Rp 240.000", diamond: "1.600 Robux", DP: "(DP 2.286)"},
    {name: "Top Up Roblox", price: "Rp 315.000", diamond: "2.100 Robux", DP: "(DP 3.000)"},
    {name: "Top Up Roblox", price: "Rp 525.000", diamond: "3.500 Robux", DP: "(DP 5.000)"},
];

// const buyDiamond = [
//     {name: "Top Up Roblox", price: "Rp 6.900", diamond: "50 Robux", DP: "(DP 71)"},
//     {name: "Top Up Roblox", price: "Rp 10.350", diamond: "75 Robux", DP: "(DP 107)"},
//     {name: "Top Up Roblox", price: "Rp 13.800", diamond: "100 Robux", DP: "(DP 143)"},
//     {name: "Top Up Roblox", price: "Rp 17.250", diamond: "125 Robux", DP: "(DP 179)"},
//     {name: "Top Up Roblox", price: "Rp 22.080", diamond: "160 Robux", DP: "(DP 229)"},
//     {name: "Top Up Roblox", price: "Rp 27.600", diamond: "200 Robux", DP: "(DP 286)"},
//     {name: "Top Up Roblox", price: "Rp 34.500", diamond: "250 Robux", DP: "(DP 357)"},
//     {name: "Top Up Roblox", price: "Rp 41.400", diamond: "300 Robux", DP: "(DP 429)"},
//     {name: "Top Up Roblox", price: "Rp 44.160", diamond: "320 Robux", DP: "(DP 457)"},
//     {name: "Top Up Roblox", price: "Rp 48.300", diamond: "350 Robux", DP: "(DP 500)"},
//     {name: "Top Up Roblox", price: "Rp 57.960", diamond: "420 Robux", DP: "(DP 600)"},
//     {name: "Top Up Roblox", price: "Rp 69.000", diamond: "500 Robux", DP: "(DP 714)"},
//     {name: "Top Up Roblox", price: "Rp 72.450", diamond: "525 Robux", DP: "(DP 750)"},
//     {name: "Top Up Roblox", price: "Rp 75.900", diamond: "550 Robux", DP: "(DP 786)"},
//     {name: "Top Up Roblox", price: "Rp 82.800", diamond: "600 Robux", DP: "(DP 857)"},
//     {name: "Top Up Roblox", price: "Rp 89.700", diamond: "650 Robux", DP: "(DP 929)"},
//     {name: "Top Up Roblox", price: "Rp 96.600", diamond: "700 Robux", DP: "(DP 1.000)"},
//     {name: "Top Up Roblox", price: "Rp 103.500", diamond: "750 Robux", DP: "(DP 1.071)"},
//     {name: "Top Up Roblox", price: "Rp 138.000", diamond: "1.000 Robux", DP: "(DP 1.429)"},
//     {name: "Top Up Roblox", price: "Rp 179.400", diamond: "1.300 Robux", DP: "(DP 1.857)"},
//     {name: "Top Up Roblox", price: "Rp 220.800", diamond: "1.600 Robux", DP: "(DP 2.286)"},
//     {name: "Top Up Roblox", price: "Rp 289.800", diamond: "2.100 Robux", DP: "(DP 3.000)"},
//     {name: "Top Up Roblox", price: "Rp 483.000", diamond: "3.500 Robux", DP: "(DP 5.000)"},
// ];



buyDiamond.forEach(buyDiamond => {
    const card = document.createElement("div")
    card.classList.add("item")
    card.innerHTML = `
        <h4>${buyDiamond.diamond}</h4>
        <span style="font-size: x-small;color: #555555;">${buyDiamond.DP}</span>
        <p style="color: #00c46b;font-size: small" id="">${buyDiamond.price}</p>
    `
    topupDiamond.appendChild(card);
})

// Paket membership
const topupMember = document.getElementById("member");
const buyMembership = [
    {name: "Top Up Roblox", price: "Rp 30.000", member: "Membership Mingguan"},
    {name: "Top Up Roblox", price: "Rp 84.900", member: "Membership Bulanan"},
]
buyMembership.forEach(buyMembership => {
    const card = document.createElement("div")
    card.classList.add("item")
    card.innerHTML = `
        <h4>${buyMembership.member}</h4>
        </br>
        <p style="color: #00c46b;font-size: small" id="">${buyMembership.price}</p>
    `
    topupMember.appendChild(card);
})

// Fungsi untuk pindah tab (UI)
function switchTab(tabName) {
    const tabs = document.querySelectorAll(".tab");
    const grids = document.querySelectorAll(".grid");

    tabs.forEach(t => t.classList.remove("active"));
    grids.forEach(g => g.classList.remove("active"));

    document.getElementById(tabName).classList.add("active");

    if (tabName === "topup") {
        tabs[0].classList.add("active");
    } else {
        tabs[1].classList.add("active");
    }
}
 
// Pilih paket nominal: tambahkan kelas selected saat diklik
const diamondItems = document.querySelectorAll(".item");


diamondItems.forEach(item => {
  item.addEventListener("click", () => {

    // hapus selected di semua item
    diamondItems.forEach(i => i.classList.remove("selected"));

    if (!custom.value) {
      // jika custom kosong → item boleh dipilih
      item.classList.add("selected");
      custom.value = "";
    } else{
        diamondItems.forEach(i => i.classList.remove("selected"));
    }
    // jika custom ada isinya → hanya hapus selected, tidak memilih apa pun
  });
});

// Logging perubahan metode pembayaran (debug)
const payments = document.querySelectorAll('input[name="payment"]')
payments.forEach(p => {
  p.addEventListener("change", () => {
    console.log("Metode terpilih:", p.value);
  });
});

// invoice
// Durasi hitung mundur = 1 jam (3600 detik)
const COUNTDOWN_DURATION = 3600;

// Ambil waktu expired dari localStorage dan pastikan valid
let expireTimeRaw = localStorage.getItem("invoice_expire_time");
let expireTime = null;
if (!expireTimeRaw) {
    // belum pernah dibuat -> inisialisasi baru
    expireTime = Date.now() + COUNTDOWN_DURATION * 1000;
    localStorage.setItem("invoice_expire_time", String(expireTime));
} else {
    // parse dan jika sudah lewat, reset ke sekarang + durasi
    const parsed = parseInt(expireTimeRaw, 10);
    if (Number.isFinite(parsed) && parsed > Date.now()) {
        expireTime = parsed;
    } else {
        expireTime = Date.now() + COUNTDOWN_DURATION * 1000;
        localStorage.setItem("invoice_expire_time", String(expireTime));
    }
}

// Fungsi untuk memperbarui tampilan timer
function updateTimer() {
    try {
        const timerEl = document.getElementById("timer");
        if (!timerEl) return; // tidak ada elemen timer di halaman

        const now = Date.now();
        let timeLeft = Math.floor((expireTime - now) / 1000);

        // Jika waktu habis
        if (timeLeft <= 0) {
            timerEl.textContent = "Waktu Habis";
            if (typeof countdown !== 'undefined') clearInterval(countdown);
            return;
        }

        let hours = Math.floor(timeLeft / 3600);
        let minutes = Math.floor((timeLeft % 3600) / 60);
        let seconds = timeLeft % 60;

        timerEl.textContent =
            String(hours).padStart(2, "0") + ":" +
            String(minutes).padStart(2, "0") + ":" +
            String(seconds).padStart(2, "0");
    } catch (err) {
        // Jika terjadi kesalahan, tampilkan di console agar interval tidak berhenti diam-diam
        console.error('updateTimer error:', err);
    }
}

let countdown = setInterval(updateTimer, 1000);
updateTimer();


// Tombol beli/topup
const buyButton = document.getElementById("btn-hijau");

buyButton.addEventListener("click", async () => {
    // e.preventDefault(); // ← ini perlu jika tombol adalah <a>

    const selectedDiamond = document.querySelector(".item.selected");
    const selectedPayment = document.querySelector('input[name="payment"]:checked');
    const invoiceIdElement = document.getElementById("invoice-id");
    const oderedSection = document.getElementById("ordered");
    const totalPembayaran = document.getElementById("totalPembayaran");
    
    // Validasi input sebelum mengakses properti
    if (!selectedDiamond) {
        alert("Silakan pilih nominal top up.");
        return;
    } else if (!selectedPayment) {
        alert("Silakan pilih metode pembayaran.");
        return;
    } else if (!userId.value) {
        alert("Silakan masukkan Username.");
        return;
    } else if (!nowa.value) {
        alert("Silakan masukkan Nomor WhatsApp.");
        return;
    } else if (nowa.value.length < 10 || nowa.value.length > 15 || !/^\d+$/.test(nowa.value)) {
        alert("Nomor WhatsApp tidak valid. Harap masukkan nomor yang benar.");
        return;
    } 

    // Jika metode yang belum tersedia
    if (selectedPayment.value === "Gopay" || selectedPayment.value === "OVO" || selectedPayment.value === "Dana") {
        alert("DALAM PENGERJAAN!!");
        return;
    }

    // Generate ID invoice baru (setelah validasi)
    const invoiceId = "HKA" + Math.floor(1000 + Math.random() * 9000) + "E";
    if (invoiceIdElement) invoiceIdElement.textContent = invoiceId;

    console.log("Nominal terpilih:", selectedDiamond.querySelector("h4").innerText);
    console.log("Metode terpilih:", selectedPayment.value);

    // Buat objek pesanan
    const rawPriceText = selectedDiamond.querySelector("p").innerText;
    const rawPriceNum = parseRupiahToNumber(rawPriceText);

    const pesanan = {
        diamond: selectedDiamond.querySelector("h4").innerText || custom.value,
        DP: selectedDiamond.querySelector("span").innerText,
        paymentMethod: selectedPayment.value,
        userId: userId ? userId.value : "",
        nowa: nowa ? nowa.value : "",
        nopro: nopro ? nopro.value : "",
        // simpan teks dan nilai numerik
        priceText: rawPriceText,
        priceNumeric: rawPriceNum,
        price: rawPriceText,
        invoiceId: invoiceId
    };

    // Ambil nama pemain dari input sederhana (jika ada)
    const playerNameInput = document.getElementById('playerName');
    pesanan.playerName = playerNameInput ? (playerNameInput.value || '') : '';

    // Jika metode Cash, bulatkan total ke atas ke kelipatan 1000
    if (pesanan.paymentMethod === "Cash") {
        const p = pesanan.priceNumeric ? Number(pesanan.priceNumeric) : 0;
        const base = Math.floor(p / 1000) * 1000;
        const rem = p % 1000;
        let rounded;
        if (rem === 0) {
            rounded = p;
        } else if (rem <= 500) {
            rounded = base + 500;
        } else {
            rounded = base + 1000;
        }
        pesanan.priceNumeric = rounded;
        pesanan.price = formatRupiah(rounded);
    }

    // Reset countdown (mulai ulang waktu invoice)
    const newExpire = Date.now() + COUNTDOWN_DURATION * 1000;
    localStorage.setItem("invoice_expire_time", newExpire);
    expireTime = newExpire;
    updateTimer();
    
    // Render data pesanan ke area invoice
    const dataPesanan = document.getElementById("dataPesanan");
    if (dataPesanan) {
        // hitung nilai numerik (pesanan.price mungkin string terformat)
        const baseNum = rawPriceNum || parseRupiahToNumber(rawPriceText);
        const totalNum = (typeof pesanan.priceNumeric === 'number' && pesanan.priceNumeric > 0)
            ? pesanan.priceNumeric
            : parseRupiahToNumber(String(pesanan.price));

        const hargalayananNum = Math.max(0, totalNum - baseNum);
        const hargalayananText = hargalayananNum ? formatRupiah(hargalayananNum) : formatRupiah(0);

        dataPesanan.innerHTML = `
            <p><strong>Produk:</strong> ${pesanan.diamond}</p>
            <p><strong>Default Price Robux:</strong> ${pesanan.DP}</p>
            <p><strong>Nama Pemain:</strong> ${pesanan.userId}</p>
            <p><strong>Metode:</strong> ${pesanan.paymentMethod}</p>
            <p><strong>Kode Promo:</strong> ${pesanan.nopro}</p>
            <p><strong>Harga Robux:</strong> ${pesanan.priceText}</p>
            <p><strong>Harga Layanan:</strong> ${hargalayananText}</p>
            <p><strong>Total Bayar:</strong> ${pesanan.price}</p>
            <p><strong>Invoice:</strong> ${pesanan.invoiceId}</p>
        `;
    }
    totalPembayaran.innerHTML = `Total Pembayaran: <b>${pesanan.price}</b>`;

    const invoiceArea = document.getElementById("invoice");
    if (invoiceArea) invoiceArea.style.display = "block";
    const inputData = document.querySelectorAll("#formUserId, #pilihNominal, #metodePembayaran, #dataPemesan, #deskripsiLayanan");
      inputData.forEach(section => {
         section.style.display = "none";
      });
    
    oderedSection.style.display = "block";
    // Scroll ke bagian pesanan/invoice secara halus
    if (oderedSection && typeof oderedSection.scrollIntoView === 'function') {
        oderedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        // fallback: scroll ke bagian bawah halaman
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }

});

// Data gambar untuk tiap metode pembayaran pada bagian order
const orderData = [
   {name :"Dana",img : "../img/wallet/dana.webp"},
   {name :"Gopay",img : "../img/wallet/gopay.jpg"},
   {name :"OVO",img : "../img/wallet/ovo.webp"},
   {name :"Qris",img : "../img/QRISpay.jpg"},
];

const paymentOrder = document.getElementById("paymentOrdered");

// Render panel pembayaran sesuai metode
function renderPaymentOrder(method) {
    if (!paymentOrder) return;

    // Cari data yang cocok (case-sensitive)
    const data = orderData.find(d => d.name === method);
    if (method === 'Cash') {

        // Untuk tunai, tampilkan instruksi tanpa QR
        paymentOrder.innerHTML = `
            <h3>Pembayaran</h3>
            <p>Metode: Cash</p>
            <br />
            <img src="../img/wallet/cash.png" class="qris-img" alt="Cash" style="border-radius: 20px"/> <br />
            <br />
            <p class="total" id="totalPembayaran"></p>
            <br />
            <br />
            <p><i>*Catatan: Silahkan konfirmasi pembayaran Anda dengan mengklik tombol "Konfirmasi ke Admin" di bawah.</i></p>
        `;
        return;
    } else if (method === "qris" || method === "Qris") {
        paymentOrder.innerHTML = `
            <h3>Pembayaran</h3>
            <p>${data.name}</p>
            <br />
            <img src="${data.img}" class="qris-img" alt="${data.name}" style="border-radius: 20px"/> <br />
            <p class="total" id="totalPembayaran"></p>
            <p style="font-size: small"><i>(jumlah transfrer kurang, diamond tidak di isi!)</i></p>
            <br />
            <button class="download-btn">Unduh QR Code</button>
            <br />
            <br />
            <figcaption><i><b>*Catatan:</b><br/> Setelah melakukan pembayaran, Kirim foto screenshot (tanpa edit/Crop) sebagai bukti pengiriman. "Konfirmasi ke Admin" di bawah.</i></figcaption>
            
        `;
    }
    if (data) {
        paymentOrder.innerHTML = `
            <h3>Pembayaran</h3>
            <p>${data.name}</p>
            <br />
            <img src="${data.img}" class="qris-img" alt="${data.name}" style="border-radius: 20px"/> <br />
            <p class="total" id="totalPembayaran"></p>
            <p style="font-size: small"><i>(jumlah transfrer kurang, diamond tidak di isi!)</i></p>
            <br />
            <button class="download-btn">Unduh QR Code</button>
            <br />
            <br />
            <figcaption><i><b>*Catatan:</b><br/> Setelah melakukan pembayaran, Kirim foto screenshot (tanpa edit/Crop) sebagai bukti pengiriman. "Konfirmasi ke Admin" di bawah.</i></figcaption>
            
        `;
    } else {
        // fallback
        paymentOrder.innerHTML = `
            <h3>Pembayaran</h3>
            <p>Pilih metode pembayaran</p>
        `;
    }
}



// Render saat radio payment berubah
document.querySelectorAll('input[name="payment"]').forEach(r => {
    r.addEventListener('change', (e) => {
        const method = e.target.value;
        renderPaymentOrder(method);
        setKonfirmasiVisibleByMethod(method);
    });
});

// Render awal jika ada yang terpilih
const initiallyChecked = document.querySelector('input[name="payment"]:checked');
if (initiallyChecked) {
    renderPaymentOrder(initiallyChecked.value);
    setKonfirmasiVisibleByMethod(initiallyChecked.value);
}

// Handler konfirmasi (buka WhatsApp) — dipasang sekali saja
const konfirmasiBtn = document.getElementById("konfirmasiAdmin");
if (konfirmasiBtn && !konfirmasiBtn.dataset.listenerAttached) {
    const handleKonfirmasi = () => {
        const selectedDiamond = document.querySelector(".item.selected");
        const selectedPayment = document.querySelector('input[name="payment"]:checked');

        // Hitung harga dasar dan bulatkan jika Cash
        const rawPriceText = selectedDiamond && selectedDiamond.querySelector("p") ? selectedDiamond.querySelector("p").innerText : "";
        const rawNum = parseRupiahToNumber(rawPriceText);
        let totalText = rawPriceText || "Rp 0";
        if (selectedPayment && selectedPayment.value === "Cash") {
            const rounded = rawNum ? Math.ceil(rawNum / 1000) * 1000 : 0;
            totalText = formatRupiah(rounded);
        }

        const produk = selectedDiamond && selectedDiamond.querySelector("h4") ? selectedDiamond.querySelector("h4").innerText : "";
        const metode = selectedPayment ? selectedPayment.value : "";
        const invoiceId = document.getElementById("invoice-id") ? document.getElementById("invoice-id").textContent : "";
        // Bangun URL WhatsApp (isi pesan di-encode)
        const url =
            "https://wa.me/6289514433486?text=" +
            "Saya ingin top up Roblox dengan nominal *" + encodeURIComponent(produk) +
            "*%0Amenggunakan metode pembayaran *" + encodeURIComponent(metode) + "*."+
            "*%0AInvoice: *" + encodeURIComponent(invoiceId) +
            "*%0AUsername: *" + encodeURIComponent(userId ? userId.value : "") +
            "*%0ANomor WhatsApp: *" + encodeURIComponent(nowa ? nowa.value : "") +
            "*%0AJumlah Robux: *" + encodeURIComponent(produk) +
            "*%0ADP Robux: *" + encodeURIComponent(selectedDiamond ? selectedDiamond.querySelector("span").innerText : "") + 
            "*%0AKode Promo: *" + encodeURIComponent(nopro ? nopro.value : "tidak ada") + "*."+
            "%0A*Total Pembayaran: " + encodeURIComponent(totalText) + "*" +
            '%0A%0A"Segera di isi ya minn ^^"';

        // Buka WhatsApp
        window.location.href = url;
    };

    konfirmasiBtn.addEventListener("click", handleKonfirmasi);
    konfirmasiBtn.dataset.listenerAttached = "1";
}

// Handler delegasi untuk tombol unduh QR (bekerja untuk tombol yang dibuat dinamis)
document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.download-btn');
    if (!btn) return;

    // cari gambar terkait: prioritas di dalam container, jika tidak ada pakai document
    const container = btn.closest('#paymentOrdered') || document;
    const qrisImg = container.querySelector('.qris-img') || document.querySelector('.qris-img');
    if (!qrisImg) {
        alert('Gagal: gambar QR tidak ditemukan.');
        return;
    }

    const imgSrc = qrisImg.src || qrisImg.getAttribute('src');
    if (!imgSrc) {
        alert('Gagal: sumber gambar tidak tersedia.');
        return;
    }

    try {
        const res = await fetch(imgSrc);
        if (!res.ok) throw new Error('fetch failed');
        const blob = await res.blob();
        const mimeParts = (blob.type || '').split('/');
        const ext = mimeParts[1] || imgSrc.split('.').pop().split(/[#?]/)[0] || 'jpg';
        const filename = `QrisHekaStore.${ext}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
        // Fallback: coba buat anchor langsung atau buka di tab baru
        try {
            const a = document.createElement('a');
            a.href = imgSrc;
            a.download = imgSrc.split('/').pop().split(/[#?]/)[0] || 'qris.jpg';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err2) {
            console.warn('Download failed:', err, err2);
            window.open(imgSrc, '_blank');
        }
    }
});

const tutorialGamepass = document.querySelector(".btn-merah");
const videoTutorial = document.getElementById("caraGamepass");
const tutorialGambar = document.getElementById("tutorialGambar");
tutorialGamepass.innerHTML = "Video Tutorial";
tutorialGambar.innerHTML = "Simple Tutorial";
videoTutorial.style.display = "none";
tutorialGamepass.addEventListener("click", () => {
    if (videoTutorial.style.display === "block") {
        videoTutorial.style.display = "none";
        tutorialGamepass.innerHTML = "Video Tutorial";
        tutorialGamepass.style.background = "linear-gradient(90deg, #14c3b3, #0fd6a8)";
    } else {
        videoTutorial.style.display = "block";
        tutorialGamepass.innerHTML = "Tutup Tutorial";
        tutorialGamepass.style.background = "#e63946";
    }
});
const tutorialScroll = document.getElementById("tutorialScroll");
tutorialScroll.addEventListener("click", () => {
    videoTutorial.style.display = "block";
    tutorialGamepass.innerHTML = "Tutup Tutorial";
    tutorialGamepass.style.background = "#e63946";
    videoTutorial.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Fungsi untuk mengatur visibilitas tombol konfirmasi berdasarkan metode pembayaran
function setKonfirmasiVisibleByMethod(method) {
    const konfirmasiBtn = document.getElementById("konfirmasiAdmin");
    if (!konfirmasiBtn) return;
    if (method === "Cash" || method === "Qris") {
        konfirmasiBtn.style.display = "block";
    } else {
        konfirmasiBtn.style.display = "none";
    }
}