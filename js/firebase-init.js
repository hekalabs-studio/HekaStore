// js/firebase-init.js
// Satu-satunya tempat konfigurasi & inisialisasi Firebase.
// Semua modul lain (auth-ui.js, checkout.js, main.js) import dari sini
// supaya firebaseConfig tidak lagi copy-paste dan initializeApp() tidak
// dipanggil berkali-kali di tiap halaman.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
// Catatan: TIDAK ada import firebase-functions di sini. Project ini pakai
// Spark plan (gratis) yang tidak bisa deploy Cloud Functions. Validasi
// harga & aturan order sekarang dilakukan lewat Firestore Security Rules
// (firestore.rules) — tetap server-side dan tidak bisa dimanipulasi dari
// browser, tapi tidak butuh Blaze plan. Lihat js/checkout.js.

const firebaseConfig = {
  apiKey: "AIzaSyDP2cWgKWzKvPEwMHavgWvaP03JZNOt-uM",
  authDomain: "hekaapedia.firebaseapp.com",
  projectId: "hekaapedia",
  storageBucket: "hekaapedia.firebasestorage.app",
  messagingSenderId: "335355698420",
  appId: "1:335355698420:web:32786bed198b56bc68d2a1",
  measurementId: "G-275ME2X6JG",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics gagal di beberapa lingkungan (mis. dibuka dari file://, atau
// browser dengan ad-blocker) — jangan sampai melempar error yang
// menghentikan seluruh halaman.
analyticsIsSupported()
  .then((ok) => {
    if (ok) getAnalytics(app);
  })
  .catch(() => {});
