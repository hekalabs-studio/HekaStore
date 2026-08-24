// js/profile.js
// Halaman profil user: data akun, poin loyalti, riwayat transaksi.
//
// MODE SPARK PLAN: poin tidak disimpan sebagai satu angka yang di-increment
// (itu butuh Cloud Function/transaction server agar aman dari race
// condition). Sebagai gantinya, tiap order yang statusnya sudah 'completed'
// bisa "diklaim" jadi 1 dokumen di users/{uid}/pointClaims/{orderId} — nilai
// poinnya divalidasi oleh firestore.rules langsung dari order.total asli.
// Total poin yang ditampilkan = jumlah semua dokumen klaim itu.

import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const profileContent = document.getElementById("profileContent");

function getStatusLabel(status) {
  const map = {
    pending_confirmation: "Menunggu Konfirmasi",
    pending_payment: "Menunggu Pembayaran",
    paid: "Sudah Bayar",
    processing: "Diproses",
    completed: "Selesai",
    failed: "Gagal",
    expired: "Kedaluwarsa",
  };
  return map[status] || status;
}

function getStatusColor(status) {
  if (["completed"].includes(status)) return "#0eb193";
  if (["pending_payment", "pending_confirmation"].includes(status)) return "#f4a261";
  if (["failed", "expired"].includes(status)) return "#e63946";
  if (["paid", "processing"].includes(status)) return "#2ed9b3";
  return "#888";
}

function formatRupiah(num) {
  const n = Number(num);
  if (!Number.isFinite(n)) return "";
  return "Rp " + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function renderOrders(orders) {
  if (!orders.length) {
    return `<p style="color:#888;">Belum ada riwayat transaksi.</p>`;
  }
  const rows = orders.map((o) => {
    const date = o.createdAt ? new Date(o.createdAt.toDate ? o.createdAt.toDate() : o.createdAt).toLocaleString("id-ID") : "-";
    return `<tr>
      <td>${o.invoiceId || "-"}</td>
      <td>${o.label || "-"}</td>
      <td>${o.paymentMethod || "-"}</td>
      <td>${formatRupiah(o.total || 0)}</td>
      <td><span style="color:${getStatusColor(o.status)};font-weight:700">${getStatusLabel(o.status)}</span></td>
      <td>${date}</td>
    </tr>`;
  }).join("");

  return `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
    <thead><tr style="background:#0eb193;color:#fff;">
      <th style="padding:10px;text-align:left;">Invoice</th>
      <th style="padding:10px;text-align:left;">Produk</th>
      <th style="padding:10px;text-align:left;">Metode</th>
      <th style="padding:10px;text-align:left;">Total</th>
      <th style="padding:10px;text-align:left;">Status</th>
      <th style="padding:10px;text-align:left;">Tanggal</th>
    </tr></thead><tbody>${rows}</tbody></table></div>`;
}

// Coba klaim poin untuk tiap order 'completed' yang belum pernah diklaim.
// Aman dipanggil berkali-kali: kalau sudah pernah diklaim, firestore.rules
// menolak create kedua (dokumen dgn id yang sama sudah ada) -> di-skip diam-diam.
async function autoClaimPoints(uid, completedOrders) {
  await Promise.allSettled(
    completedOrders.map(async (o) => {
      const claimRef = doc(db, "users", uid, "pointClaims", o.id);
      const existing = await getDoc(claimRef);
      if (existing.exists()) return;
      const points = Math.floor((o.total || 0) / 10000);
      if (points <= 0) return;
      try {
        await setDoc(claimRef, { points, claimedAt: new Date().toISOString() });
      } catch (err) {
        // Wajar terjadi kalau ada dua tab yang klaim bersamaan, atau order
        // ternyata belum benar-benar eligible -> aman diabaikan.
        console.warn("Klaim poin dilewati untuk order", o.id, err.code || err.message);
      }
    })
  );
}

async function getTotalPoints(uid) {
  const snap = await getDocs(collection(db, "users", uid, "pointClaims"));
  return snap.docs.reduce((sum, d) => sum + (d.data().points || 0), 0);
}

function renderEditNameForm(user) {
  return `
    <form id="hekaEditNameForm" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
      <input type="text" id="hekaNewName" placeholder="Nama panggilan baru" value="${(user.displayName || "").replace(/"/g, "&quot;")}"
        style="flex:1;min-width:160px;padding:8px 10px;border:1px solid #ccc;border-radius:8px;" />
      <button type="submit" style="padding:8px 16px;border:none;border-radius:8px;background:linear-gradient(0deg,#0eb193,#2ed9b3);color:#fff;font-weight:700;cursor:pointer;">Simpan</button>
    </form>
    <p id="hekaEditNameMsg" style="font-size:.85rem;margin-top:6px;"></p>
  `;
}

async function loadProfile(user) {
  if (!user) {
    profileContent.innerHTML = `<div style="background:#fff;padding:24px;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.08);text-align:center;">
      <p>Anda belum login. Silakan login terlebih dahulu.</p>
      <br/><button id="hekaProfileLoginBtn" style="padding:10px 18px;border:none;border-radius:8px;background:linear-gradient(0deg,#0eb193,#2ed9b3);color:#fff;font-weight:700;cursor:pointer;">Login / Daftar</button>
    </div>`;
    document.getElementById("hekaProfileLoginBtn")?.addEventListener("click", () => {
      const modal = document.getElementById("hekaAuthOverlay");
      if (modal) modal.hidden = false;
    });
    return;
  }

  profileContent.innerHTML = `<div style="background:#fff;padding:24px;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.08);margin-bottom:16px;">
    <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
      <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(0deg,#0eb193,#2ed9b3);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:700;flex-shrink:0;">${(user.displayName || user.email || "U").charAt(0).toUpperCase()}</div>
      <div style="flex:1;min-width:180px;">
        <div style="font-size:1.1rem;font-weight:700;" id="hekaDisplayName">${user.displayName || "User"}</div>
        <div style="color:#555;font-size:0.9rem;">${user.email}</div>
      </div>
    </div>
    ${renderEditNameForm(user)}
  </div>

  <div style="background:#fff;padding:24px;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.08);margin-bottom:16px;">
    <h4 style="margin:0 0 12px;">Poin Loyalitas</h4>
    <div id="hekaPoints" style="font-size:2rem;font-weight:800;color:#0eb193;">-</div>
    <small style="color:#666;">Dapatkan 1 poin setiap Rp 10.000 transaksi yang sudah dikonfirmasi admin (status Selesai).</small>
  </div>

  <div style="background:#fff;padding:24px;border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.08);">
    <h4 style="margin:0 0 12px;">Riwayat Transaksi</h4>
    <div id="hekaOrders">Memuat...</div>
    <br/><button id="hekaLogoutBtn2" style="padding:10px 16px;border:none;border-radius:8px;background:#e63946;color:#fff;font-weight:700;cursor:pointer;">Logout</button>
  </div>`;

  document.getElementById("hekaLogoutBtn2")?.addEventListener("click", async () => {
    await signOut(auth);
  });

  document.getElementById("hekaEditNameForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("hekaEditNameMsg");
    const newName = document.getElementById("hekaNewName").value.trim();
    if (!newName) { msg.textContent = "Nama tidak boleh kosong."; msg.style.color = "#e63946"; return; }
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      await setDoc(doc(db, "users", user.uid), { displayName: newName }, { merge: true });
      document.getElementById("hekaDisplayName").textContent = newName;
      msg.textContent = "Nama berhasil diperbarui.";
      msg.style.color = "#0eb193";
    } catch (err) {
      msg.textContent = "Gagal menyimpan: " + err.message;
      msg.style.color = "#e63946";
    }
  });

  try {
    const ordersSnap = await getDocs(
      query(collection(db, "orders"), where("uid", "==", user.uid), orderBy("createdAt", "desc"), limit(50))
    );
    const orders = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    document.getElementById("hekaOrders").innerHTML = renderOrders(orders);

    const completedOrders = orders.filter((o) => o.status === "completed");
    await autoClaimPoints(user.uid, completedOrders);
    const points = await getTotalPoints(user.uid);
    document.getElementById("hekaPoints").textContent = points.toLocaleString("id-ID");
  } catch (err) {
    console.error("Gagal memuat profil:", err);
    document.getElementById("hekaOrders").innerHTML = `<p style="color:#e63946;">Gagal memuat data. Muat ulang halaman.</p>`;
  }
}

onAuthStateChanged(auth, (user) => {
  loadProfile(user);
});
