// Games
const games = [
  { name: "Mobile Legends", img: "./img/games/logoml.webp", link: "html/mobileLegend.html" },
  { name: "Free Fire", img: "./img/games/logoff.webp", link: "html/freefire.html" },
  { name: "Roblox", img: "./img/games/roblox.png", link: "html/roblox.html" },
  { name: "PUBG Mobile", img: "./img/games/pubg.webp", link: "" },
  { name: "Genshin Impact", img: "./img/games/logo-genshin.webp", link: "" },
  { name: "Call of Duty Mobile", img: "./img/games/logocod.webp", link: "" },
  { name: "Sausage Man", img: "./img/games/sausageman.webp", link: ""},
  { name: "Super Sus", img: "./img/games/supersus.webp", link: ""}
];
//pulsa
const pulsa = [
  {name: "Telkomsel", img: "./img/pulsa/telkomsel.webp", link: "html/PulsaTelkomsel.html" },
  {name: "Three", img: "./img/pulsa/tri.webp", link: "html/pulsaTri.html" },
  {name: "Indosat", img: "./img/pulsa/indosat.webp", link: "html/pulsaIndosat.html" },
  {name: "XL", img: "./img/pulsa/xl.webp", link: "html/pulsaXL.html" },
]
const listrik = {name : "Listrik", img: "./img/logopln.webp", link : "html/tokenListrik.html"}

const listGrid = document.getElementById("listGrid");
// GAMES
games.forEach(game => {
  const card = document.createElement("div");
  card.classList.add("gameCard");
  card.innerHTML = `
    <img src="${game.img}" alt="${game.name}">
    <a class="buttonGameCard" href="${game.link}" style="font-size: small">${game.name}</a>
  `;
  listGrid.appendChild(card);
});
// PULSA
pulsa.forEach(pulsa => {
  const card = document.createElement("div");
  card.classList.add("pulsaCard");
  card.innerHTML = `
    <img src="${pulsa.img}" alt="${pulsa.name}">
    <a class="buttonGameCard" href="${pulsa.link}" style="font-size: small">${pulsa.name}</a>
  `;
  listGrid.appendChild(card);
});
// LISTRIK
  const card = document.createElement("div");
  card.classList.add("listrikCard");
  card.innerHTML = `
    <img src="${listrik.img}" alt="${listrik.name}">
    <a class="buttonGameCard" href="${listrik.link}" style="font-size: small">${listrik.name}</a>
  `;
  listGrid.appendChild(card);


  //ChooseBuy
  let listrikCard = document.getElementsByClassName("listrikCard");
  let choose = [document.getElementById("games"),document.getElementById("pulsa"),document.getElementById("listrik")]
  let listJudul = document.getElementById("listJudul")
  let pulsaCard = document.getElementsByClassName("pulsaCard");
  let gamesCard = document.getElementsByClassName("gameCard");

  choose[0].addEventListener("click", function() {
    listJudul.innerHTML = "🎮 Games"
    for(let i = 0; i < 4; i++) {
      pulsaCard[i].style.display = "none"
    }
    for(let i = 0; i < 8; i++) {
      gamesCard[i].style.display = "block"
    }
    listrikCard[0].style.display = "none";
    choose[0].style.background = "linear-gradient(0deg,#0eb193,#2ed9b3)";
    choose[0].style.color = "#f5f5f5";
    choose[1].style.background = "#dfdfdf"
    choose[1].style.color = "black"
    choose[2].style.background = "#dfdfdf"
    choose[2].style.color = "black"
  })


  choose[1].addEventListener("click", () => {
    listJudul.innerHTML = "📱 Pulsa"
    for(let i = 0; i < 4; i++) {
      pulsaCard[i].style.display = "block"
    }
    for(let i = 0; i < 8; i++) {
      gamesCard[i].style.display = "none"
    }
    listrikCard[0].style.display = "none";
    choose[1].style.background = "linear-gradient(0deg,#0eb193,#2ed9b3)";
    choose[1].style.color = "#f5f5f5";
    choose[0].style.background = "#dfdfdf"
    choose[0].style.color = "black"
    choose[2].style.background = "#dfdfdf"
    choose[2].style.color = "black"
  })

  choose[2].addEventListener("click", () => {
    listJudul.innerHTML = "⚡ Token Listrik"
    for(let i = 0; i < 4; i++) {
      pulsaCard[i].style.display = "none"
    }
    for(let i = 0; i < 8; i++) {
      gamesCard[i].style.display = "none"
    }
    listrikCard[0].style.display = "block";
    choose[1].style.background = "#dfdfdf";
    choose[1].style.color = "black";
    choose[0].style.background = "#dfdfdf"
    choose[0].style.color = "black"
    choose[2].style.background = "linear-gradient(0deg,#0eb193,#2ed9b3)";
    choose[2].style.color = "#f5f5f5";
  })

  // footer
  // Contoh: animasi hover untuk ikon sosial
document.querySelectorAll(".social-icons img").forEach(icon => {
    icon.addEventListener("mouseover", () => {
        icon.style.transform = "scale(1.15)";
        icon.style.transition = "0.2s";
        icon.style.cursor = "pointer";
    });
    icon.addEventListener("mouseout", () => {
        icon.style.transform = "scale(1)";
    });
});
