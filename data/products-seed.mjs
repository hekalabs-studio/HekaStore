// data/products-seed.mjs
// SATU-SATUNYA tempat daftar harga didefinisikan untuk keperluan seeding.
// Dipakai oleh:
//   - tools/seed-once.html   (isi dari browser, tanpa Node/service account)
//   - scripts/seedProducts.js (isi dari terminal via Admin SDK)
// Kalau harga berubah, cukup edit di sini lalu jalankan salah satu cara di atas.

function toNumber(rupiahStr) {
  return Number(String(rupiahStr).replace(/[^0-9]/g, ""));
}

function build() {
  const list = [];
  const add = (category, type, label, price, tag) =>
    list.push({ category, type, label, price: toNumber(price), tag: tag || null });

  /* Free Fire */
  add("freefire", "topup", "5 Diamonds", "Rp 2.500");
  add("freefire", "topup", "20 Diamonds", "Rp 5.000");
  add("freefire", "topup", "50 Diamonds", "Rp 8.500");
  add("freefire", "topup", "70 Diamonds", "Rp 10.000", "⭐ BEST SELLER");
  add("freefire", "topup", "100 Diamonds", "Rp 14.900", "🔥 RECOMMENDED");
  add("freefire", "topup", "140 Diamonds", "Rp 19.800");
  add("freefire", "topup", "210 Diamonds", "Rp 31.000", "💎 SUPER VALUE");
  add("freefire", "topup", "355 Diamonds", "Rp 52.000", "🚀 HEMAT BANGET");
  add("freefire", "topup", "425 Diamonds", "Rp 66.000");
  add("freefire", "topup", "720 Diamonds", "Rp 105.000", "🔥 VALUE");
  add("freefire", "topup", "860 Diamonds", "Rp 125.000");
  add("freefire", "topup", "930 Diamonds", "Rp 135.000");
  add("freefire", "topup", "1000 Diamonds", "Rp 145.000", "⭐ POPULER");
  add("freefire", "topup", "1440 Diamonds", "Rp 205.000", "💎 BEST DEAL");
  add("freefire", "topup", "1450 Diamonds", "Rp 210.000");
  add("freefire", "topup", "2000 Diamonds", "Rp 285.000", "🚀 BIG SAVE");
  add("freefire", "topup", "2180 Diamonds", "Rp 310.000");
  add("freefire", "topup", "2355 Diamonds", "Rp 335.000");
  add("freefire", "topup", "2720 Diamonds", "Rp 385.000");
  add("freefire", "topup", "3640 Diamonds", "Rp 515.000", "💎 SULTAN");
  add("freefire", "topup", "4000 Diamonds", "Rp 565.000", "🔥 MAX VALUE");
  add("freefire", "membership", "Membership Mingguan", "Rp 30.000");
  add("freefire", "membership", "Membership Bulanan", "Rp 84.900");

  /* Mobile Legends */
  add("mobilelegend", "topup", "5 Diamonds", "Rp 2.000");
  add("mobilelegend", "topup", "10 Diamonds (9 + 1 Bonus)", "Rp 4.000");
  add("mobilelegend", "topup", "14 Diamonds (13 + 1 Bonus)", "Rp 5.000");
  add("mobilelegend", "topup", "28 Diamonds (25 + 3 Bonus)", "Rp 9.500");
  add("mobilelegend", "topup", "36 Diamonds (33 + 3 Bonus)", "Rp 12.000");
  add("mobilelegend", "topup", "44 Diamonds (40 + 4 Bonus)", "Rp 14.000");
  add("mobilelegend", "topup", "59 Diamonds (53 + 6 Bonus)", "Rp 16.600");
  add("mobilelegend", "topup", "71 Diamonds (64 + 7 Bonus)", "Rp 21.900");
  add("mobilelegend", "topup", "113 Diamonds (102 + 11 Bonus)", "Rp 32.490");
  add("mobilelegend", "topup", "128 Diamonds (117 + 11 Bonus)", "Rp 38.100");
  add("mobilelegend", "topup", "148 Diamonds (134 + 14 Bonus)", "Rp 43.300");
  add("mobilelegend", "topup", "184 Diamonds (167 + 17 Bonus)", "Rp 54.100");
  add("mobilelegend", "membership", "Weekly Diamond Pass", "Rp 30.000");
  add("mobilelegend", "membership", "Weekly Diamond Pass x2", "Rp 59.900");
  add("mobilelegend", "membership", "Weekly Diamond Pass x3", "Rp 88.500");
  add("mobilelegend", "membership", "Weekly Diamond Pass x4", "Rp 118.000");
  add("mobilelegend", "membership", "Weekly Diamond Pass x5", "Rp 117.500");
  add("mobilelegend", "membership", "Twilight Pass", "Rp 158.900");

  /* Roblox (tanpa "membership" - lihat catatan bug di README) */
  add("roblox", "topup", "50 Robux (DP 71)", "Rp 7.500");
  add("roblox", "topup", "75 Robux (DP 107)", "Rp 11.250");
  add("roblox", "topup", "100 Robux (DP 143)", "Rp 15.000");
  add("roblox", "topup", "125 Robux (DP 179)", "Rp 18.750");
  add("roblox", "topup", "160 Robux (DP 229)", "Rp 24.000");
  add("roblox", "topup", "200 Robux (DP 286)", "Rp 30.000");
  add("roblox", "topup", "250 Robux (DP 357)", "Rp 37.500");
  add("roblox", "topup", "300 Robux (DP 429)", "Rp 45.000");
  add("roblox", "topup", "320 Robux (DP 457)", "Rp 48.000");
  add("roblox", "topup", "350 Robux (DP 500)", "Rp 52.500");
  add("roblox", "topup", "420 Robux (DP 600)", "Rp 63.000");
  add("roblox", "topup", "500 Robux (DP 714)", "Rp 75.000");
  add("roblox", "topup", "525 Robux (DP 750)", "Rp 78.750");
  add("roblox", "topup", "550 Robux (DP 786)", "Rp 82.500");
  add("roblox", "topup", "600 Robux (DP 857)", "Rp 90.000");
  add("roblox", "topup", "650 Robux (DP 929)", "Rp 97.500");
  add("roblox", "topup", "700 Robux (DP 1.000)", "Rp 105.000");
  add("roblox", "topup", "750 Robux (DP 1.071)", "Rp 112.500");
  add("roblox", "topup", "1.000 Robux (DP 1.429)", "Rp 150.000");
  add("roblox", "topup", "1.300 Robux (DP 1.857)", "Rp 195.000");
  add("roblox", "topup", "1.600 Robux (DP 2.286)", "Rp 240.000");
  add("roblox", "topup", "2.100 Robux (DP 3.000)", "Rp 315.000");
  add("roblox", "topup", "3.500 Robux (DP 5.000)", "Rp 525.000");

  /* Pulsa */
  const pulsaSteps = [
    ["Rp 7.000", "5.000"], ["Rp 12.000", "10.000"], ["Rp 22.000", "20.000"],
    ["Rp 38.000", "35.000"], ["Rp 53.000", "50.000"], ["Rp 78.000", "75.000"],
    ["Rp 105.000", "100.000"], ["Rp 155.000", "150.000"], ["Rp 205.000", "200.000"],
  ];
  const providers = { pulsatelkomsel: "Telkomsel", pulsaindosat: "Indosat", pulsaxl: "XL", pulsatri: "Tri" };
  for (const cat of Object.keys(providers)) {
    pulsaSteps.forEach(([price, nominal]) => add(cat, "topup", `${nominal} Pulsa ${providers[cat]}`, price));
  }

  /* Token Listrik */
  add("tokenlistrik", "topup", "20.000 Token Listrik", "Rp 23.000");
  add("tokenlistrik", "topup", "50.000 Token Listrik", "Rp 53.000");
  add("tokenlistrik", "topup", "100.000 Token Listrik", "Rp 105.000");
  add("tokenlistrik", "topup", "150.000 Token Listrik", "Rp 155.000");
  add("tokenlistrik", "topup", "200.000 Token Listrik", "Rp 205.000");

  return list;
}

export const PRODUCTS = build();
