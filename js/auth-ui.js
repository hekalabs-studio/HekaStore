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
.heka-user-chip{display:flex;align-items:center;gap:8px;color:#f5f5f5;font-size:.9rem}
.heka-user-chip button{background:none;border:1px solid #f5f5f5;color:#f5f5f5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.8rem}
`;

function injectModalOnce() {
  if (document.getElementById("hekaAuthOverlay")) return;
  const style = document.createElement("style");
  style.textContent = MODAL_CSS;
  document.head.appendChild(style);
  document.body.insertAdjacentHTML("beforeend", MODAL_HTML);
}

function setTab(tab) {
  document.querySelectorAll(".heka-auth-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.getElementById("hekaLoginForm").hidden = tab !== "login";
  document.getElementById("hekaRegisterForm").hidden = tab !== "register";
  document.getElementById("hekaAuthTitle").textContent = tab === "login" ? "Masuk ke Hekaapedia" : "Buat Akun Hekaapedia";
}

function openModal(defaultTab = "login") {
  injectModalOnce();
  setTab(defaultTab);
  document.getElementById("hekaAuthOverlay").hidden = false;
}
function closeModal() {
  const overlay = document.getElementById("hekaAuthOverlay");
  if (overlay) overlay.hidden = true;
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
        // Buat dokumen profil + basis sistem poin (poin HANYA boleh ditambah
        // oleh Cloud Function saat order 'completed', lihat firestore.rules)
        await setDoc(doc(db, "users", cred.user.uid), {
          displayName,
          email,
          points: 0,
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
    chip.innerHTML = `<span>👋 ${user.displayName || user.email}</span><button type="button" id="hekaLogoutBtn">Logout</button>`;
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

wireModalEvents();
onAuthStateChanged(auth, (user) => renderNavForUser(user));

// Dipakai checkout.js untuk tahu siapa yang sedang login (boleh null / tamu)
export function getCurrentUser() {
  return auth.currentUser;
}
export { auth };
