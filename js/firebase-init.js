// js/firebase-init.js
// Satu-satunya tempat konfigurasi & inisialisasi Firebase.
// Semua modul lain (auth-ui.js, checkout.js, main.js) import dari sini
// supaya firebaseConfig tidak lagi copy-paste dan initializeApp() tidak
// dipanggil berkali-kali di tiap halaman.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-functions.js";

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
export const functions = getFunctions(app, "asia-southeast2"); // region terdekat ke ID, samakan dgn region di functions/index.js

// Analytics gagal di beberapa lingkungan (mis. dibuka dari file://, atau
// browser dengan ad-blocker) — jangan sampai melempar error yang
// menghentikan seluruh halaman.
analyticsIsSupported()
  .then((ok) => {
    if (ok) getAnalytics(app);
  })
  .catch(() => {});
