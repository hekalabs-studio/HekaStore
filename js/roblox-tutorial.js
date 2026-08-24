// js/roblox-tutorial.js
// Fitur toggle "Video Tutorial Gamepass" yang sebelumnya ada di
// script_roblox.js. Dipisah dari checkout.js karena ini murni UI khusus
// halaman Roblox, tidak ada hubungannya dengan proses checkout/harga.
document.addEventListener("DOMContentLoaded", () => {
  const tutorialGamepass = document.querySelector(".btn-merah");
  const videoTutorial = document.getElementById("caraGamepass");
  const tutorialGambar = document.getElementById("tutorialGambar");
  const tutorialScroll = document.getElementById("tutorialScroll");
  if (!tutorialGamepass || !videoTutorial) return;

  tutorialGamepass.innerHTML = "Video Tutorial";
  if (tutorialGambar) tutorialGambar.innerHTML = "Simple Tutorial";
  videoTutorial.style.display = "none";

  tutorialGamepass.addEventListener("click", () => {
    const showing = videoTutorial.style.display === "block";
    videoTutorial.style.display = showing ? "none" : "block";
    tutorialGamepass.innerHTML = showing ? "Video Tutorial" : "Tutup Tutorial";
    tutorialGamepass.style.background = showing ? "linear-gradient(90deg, #14c3b3, #0fd6a8)" : "#e63946";
  });

  if (tutorialScroll) {
    tutorialScroll.addEventListener("click", () => {
      videoTutorial.style.display = "block";
      tutorialGamepass.innerHTML = "Tutup Tutorial";
      tutorialGamepass.style.background = "#e63946";
      videoTutorial.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
});
