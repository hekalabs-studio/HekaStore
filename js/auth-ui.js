// js/auth-ui.js
// Mengganti tombol Login/Daftar yang tadinya cuma alert('nanti tak tambahin')
// dengan Firebase Authentication (email/password) yang beneran.
//
// Modal auth di-inject lewat JS (bukan ditulis ulang di 9 file HTML) supaya
// tidak menambah duplikasi markup. Cukup include modul ini di tiap halaman.

import { auth, db } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const MODAL_HTML = `
<div id="hekaAuthOverlay" class="heka-auth-overlay" hidden>
  <div class="heka-auth-modal" role="dialog" aria-modal="true" aria-labelledby="hekaAuthTitle">
    <button type="button" class="heka-auth-close" aria-label="Tutup">&times;</button>
    <p id="hekaAuthNote" class="heka-auth-note" hidden></p>
    <div class="heka-auth-tabs">
      <button type="button" class="heka-auth-tab active" data-tab="login">Login</button>
      <button type="button" class="heka-auth-tab" data-tab="register">Daftar</button>
    </div>

    <h3 id="hekaAuthTitle" class="heka-auth-heading">Masuk ke Hekaapedia</h3>

    <form id="hekaLoginForm" class="heka-auth-form">
      <input type="email" name="email" placeholder="Email" required autocomplete="email" />
      <input type="password" name="password" placeholder="Password" required autocomplete="current-password" minlength="6" />
      <p class="heka-auth-error" data-for="login"></p>
      <button type="submit" class="heka-auth-submit">Login</button>
    </form>

    <form id="hekaRegisterForm" class="heka-auth-form" hidden>
      <input type="text" name="displayName" placeholder="Nama Panggilan" required />
      <input type="email" name="email" placeholder="Email" required autocomplete="email" />
      <input type="password" name="password" placeholder="Password (min. 6 karakter)" required autocomplete="new-password" minlength="6" />
      <p class="heka-auth-error" data-for="register"></p>
      <button type="submit" class="heka-auth-submit">Daftar</button>
    </form>
  </div>
</div>
`;

const MODAL_CSS = `
.heka-auth-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999}
.heka-auth-overlay[hidden]{display:none}
.heka-auth-modal{background:#fff;color:#111;border-radius:14px;padding:28px 26px;width:92%;max-width:360px;position:relative;box-shadow:0 10px 40px rgba(0,0,0,.3);font-family:inherit}
.heka-auth-close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:#666}
.heka-auth-tabs{display:flex;gap:8px;margin-bottom:14px}
.heka-auth-tab{flex:1;padding:8px;border:none;border-radius:8px;background:#eee;cursor:pointer;font-weight:600}
.heka-auth-tab.active{background:linear-gradient(0deg,#0eb193,#2ed9b3);color:#fff}
.heka-auth-heading{margin:0 0 14px;font-size:1.05rem}
.heka-auth-form input{width:100%;box-sizing:border-box;padding:10px 12px;margin-bottom:10px;border:1px solid #ccc;border-radius:8px;font-size:.95rem}
.heka-auth-submit{width:100%;padding:10px;border:none;border-radius:8px;background:linear-gradient(0deg,#0eb193,#2ed9b3);color:#fff;font-weight:700;cursor:pointer}
.heka-auth-error{color:#e63946;font-size:.85rem;min-height:1.1em;margin:-2px 0 8px}
.heka-auth-note{background:#e6f9f3;border:1.5px solid #b5e8d9;color:#0b7a63;font-size:.84rem;padding:9px 12px;border-radius:8px;margin:0 0 12px;line-height:1.45}
.heka-user-chip{position:relative;display:flex;align-items:center;color:#f5f5f5;font-size:.9rem}
.heka-user-chip>a{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.14);border:1.5px solid rgba(255,255,255,.45);padding:5px 14px 5px 6px;border-radius:999px;color:#fff;text-decoration:none;transition:background .2s ease,transform .2s ease,box-shadow .2s ease}
.heka-user-chip>a:hover{background:rgba(255,255,255,.26);transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,.15)}
.heka-user-avatar{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#ffd76a,#ffb347);color:#5a3b00;display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:800;flex-shrink:0;box-shadow:0 0 0 2px rgba(255,255,255,.75)}
.heka-user-name{max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}
.heka-user-caret{font-size:.6rem;opacity:.85}
.heka-user-menu{position:absolute;top:calc(100% + 10px);right:0;background:#fff;color:#222;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.28);min-width:210px;overflow:hidden;display:none;z-index:600}
.heka-user-menu.open{display:block;animation:hekaMenuIn .18s ease}
@keyframes hekaMenuIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.heka-user-menu-header{padding:12px 16px;background:#f1fbf7;border-bottom:1px solid #e3f2ec}
.heka-menu-hello{font-size:.75rem;color:#6b7c77;margin-bottom:2px}
.heka-menu-name{font-weight:700;font-size:.95rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.heka-menu-item{display:flex;align-items:center;gap:10px;width:100%;padding:11px 16px;background:none;border:none;text-align:left;font-size:.9rem;color:#222;cursor:pointer;text-decoration:none;font-family:inherit}
.heka-menu-item:hover{background:#ecfdf8;color:#0c937b}
.heka-menu-logout{border-top:1px solid #eee;color:#e63946;font-weight:600}
.heka-menu-logout:hover{background:#fdeeee;color:#c1121f}
@media (max-width:768px){
.heka-user-chip>a{padding:4px 10px 4px 5px}
.heka-user-avatar{width:28px;height:28px;font-size:.8rem}
.heka-user-name{max-width:96px;font-size:.85rem}
.heka-user-menu{min-width:190px}
}
`;

function injectStylesOnce() {
  // CSS chip profil & modal harus terpasang SEJAK AWAL.
  // Kalau hanya di-inject saat modal dibuka, user yang sudah login
  // melihat chip profil tanpa style (berantakan) — bug lama.
  if (document.getElementById("hekaAuthStyles")) return;
  const style = document.createElement("style");
  style.id = "hekaAuthStyles";
  style.textContent = MODAL_CSS;
  document.head.appendChild(style);
}

function injectModalOnce() {
  if (document.getElementById("hekaAuthOverlay")) return;
  injectStylesOnce();
  document.body.insertAdjacentHTML("beforeend", MODAL_HTML);
}

function setTab(tab) {
  document.querySelectorAll(".heka-auth-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.getElementById("hekaLoginForm").hidden = tab !== "login";
  document.getElementById("hekaRegisterForm").hidden = tab !== "register";
  document.getElementById("hekaAuthTitle").textContent = tab === "login" ? "Masuk ke Hekaapedia" : "Buat Akun Hekaapedia";
}

function openModal(defaultTab = "login", note = "") {
  injectModalOnce();
  setTab(defaultTab);
  // Note opsional: pesan konteks kenapa modal auth dibuka (mis. wajib login utk beli)
  const noteEl = document.getElementById("hekaAuthNote");
  if (noteEl) {
    noteEl.innerHTML = note || "";
    noteEl.hidden = !note;
  }
  document.getElementById("hekaAuthOverlay").hidden = false;
}
function closeModal() {
  const overlay = document.getElementById("hekaAuthOverlay");
  if (overlay) overlay.hidden = true;
  const noteEl = document.getElementById("hekaAuthNote");
  if (noteEl) noteEl.hidden = true;
}

function friendlyAuthError(err) {
  const map = {
    "auth/email-already-in-use": "Email sudah terdaftar. Coba login.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/weak-password": "Password minimal 6 karakter.",
    "auth/invalid-credential": "Email atau password salah.",
    "auth/wrong-password": "Email atau password salah.",
    "auth/user-not-found": "Akun tidak ditemukan. Coba daftar dulu.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi nanti.",
  };
  return map[err.code] || "Terjadi kesalahan. Silakan coba lagi.";
}

function wireModalEvents() {
  document.addEventListener("click", (e) => {
    if (e.target.matches(".heka-auth-close") || e.target.id === "hekaAuthOverlay") closeModal();
    const tabBtn = e.target.closest(".heka-auth-tab");
    if (tabBtn) setTab(tabBtn.dataset.tab);
  });

  document.addEventListener("submit", async (e) => {
    if (e.target.id === "hekaLoginForm") {
      e.preventDefault();
      const errEl = e.target.querySelector('.heka-auth-error[data-for="login"]');
      errEl.textContent = "";
      const { email, password } = Object.fromEntries(new FormData(e.target));
      try {
        await signInWithEmailAndPassword(auth, email, password);
        closeModal();
        e.target.reset();
      } catch (err) {
        errEl.textContent = friendlyAuthError(err);
      }
    }

    if (e.target.id === "hekaRegisterForm") {
      e.preventDefault();
      const errEl = e.target.querySelector('.heka-auth-error[data-for="register"]');
      errEl.textContent = "";
      const { displayName, email, password } = Object.fromEntries(new FormData(e.target));
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        // Buat dokumen profil dasar. Poin loyalti TIDAK disimpan sebagai
        // field di sini -> lihat users/{uid}/pointClaims di firestore.rules
        // dan js/profile.js untuk cara poin dihitung (aman tanpa Cloud Function).
        await setDoc(doc(db, "users", cred.user.uid), {
          displayName,
          email,
          createdAt: serverTimestamp(),
        });
        closeModal();
        e.target.reset();
      } catch (err) {
        errEl.textContent = friendlyAuthError(err);
      }
    }
  });
}

function profileUrl() {
  // auth-ui.js dipakai baik di halaman root (index.html, profile.html)
  // maupun di html/*.html -> path ke profile.html beda tergantung lokasi.
  return window.location.pathname.includes("/html/") ? "../profile.html" : "profile.html";
}

function renderNavForUser(user) {
  const loginBtn = document.getElementById("loginBtn");
  const daftarBtn = document.getElementById("daftarBtn");
  if (!loginBtn || !daftarBtn) return;

  // Buang handler alert('nanti tak tambahin') lama kalau masih ada di HTML.
  loginBtn.removeAttribute("onclick");
  daftarBtn.removeAttribute("onclick");

  const container = loginBtn.parentElement;
  let chip = document.getElementById("hekaUserChip");

  if (user) {
    loginBtn.style.display = "none";
    daftarBtn.style.display = "none";
    if (!chip) {
      chip = document.createElement("div");
      chip.id = "hekaUserChip";
      chip.className = "heka-user-chip";
      container.appendChild(chip);
    }
    const initial = (user.displayName || user.email || "U").charAt(0).toUpperCase();
    chip.innerHTML = `
      <a href="${profileUrl()}" id="hekaUserTrigger" title="Akun saya">
        <span class="heka-user-avatar">${initial}</span>
        <span class="heka-user-name">${user.displayName || user.email}</span>
        <span class="heka-user-caret">▼</span>
      </a>
      <div class="heka-user-menu" id="hekaUserMenu">
        <div class="heka-user-menu-header">
          <div class="heka-menu-hello">Halo, 👋</div>
          <div class="heka-menu-name">${user.displayName || user.email}</div>
        </div>
        <a class="heka-menu-item" href="${profileUrl()}">👤 Profil Saya</a>
        <button type="button" class="heka-menu-item heka-menu-logout" id="hekaLogoutBtn">⏻ Logout</button>
      </div>
    `;
  } else {
    loginBtn.style.display = "";
    daftarBtn.style.display = "";
    if (chip) chip.remove();
    loginBtn.onclick = () => openModal("login");
    daftarBtn.onclick = () => openModal("register");
  }
}

document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "hekaLogoutBtn") signOut(auth);
});

// Dropdown menu akun (avatar + nama profil) di navbar
document.addEventListener("click", (e) => {
  const menu = document.getElementById("hekaUserMenu");
  if (!menu) return;
  const trigger = e.target.closest("#hekaUserTrigger");
  if (trigger) {
    e.preventDefault();
    menu.classList.toggle("open");
    return;
  }
  if (!menu.contains(e.target)) menu.classList.remove("open");
});

injectStylesOnce();
wireModalEvents();
onAuthStateChanged(auth, (user) => renderNavForUser(user));

// Dipakai checkout.js untuk tahu siapa yang sedang login (boleh null / tamu)
export function getCurrentUser() {
  return auth.currentUser;
}
export { auth, openModal };
