"use strict";

const coffees = [
  { id: "colombia", origin: "Colombia · Huila", name: "Dulce Altura", notes: "Caramelo, manzana roja y cacao", cents: 1490, image: "colombia.webp", alt: "Bolsa de café color terracota sobre un fondo cálido" },
  { id: "etiopia", origin: "Etiopía · Sidama", name: "Flor de Sidama", notes: "Jazmín, melocotón y bergamota", cents: 1690, image: "etiopia.webp", alt: "Bolsa de café verde bosque sobre un fondo verde suave" },
  { id: "brasil", origin: "Brasil · Minas Gerais", name: "Casa de Minas", notes: "Avellana, chocolate y panela", cents: 1390, image: "brasil.webp", alt: "Bolsa de café color crema sobre un fondo arena" },
];

const cafes = [
  { name: "Toma Café", address: "Calle de la Palma, 49", neighborhood: "Malasaña", x: 46, y: 23 },
  { name: "Misión Café", address: "Calle de los Reyes, 5", neighborhood: "Conde Duque", x: 34, y: 32 },
  { name: "Osom Coffee", address: "Calle de Santa Teresa, 2", neighborhood: "Salesas", x: 67, y: 25 },
  { name: "ACID Café", address: "Calle de la Verónica, 9", neighborhood: "Barrio de las Letras", x: 65, y: 65 },
  { name: "Hola Coffee", address: "Calle del Doctor Fourquet, 33", neighborhood: "Lavapiés", x: 61, y: 80 },
];

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const money = (cents) => currency.format(cents / 100);
const productGrid = document.querySelector("#products");
const basket = document.querySelector("#basket");
const bagCount = document.querySelector("#bag-count");
const basketItems = document.querySelector("#basket-items");
const notice = document.querySelector("#notice");
const storageKey = "coffeeshop-basket";

let savedBasket;
try {
  savedBasket = JSON.parse(localStorage.getItem(storageKey));
} catch {
  savedBasket = null;
}
const quantities = new Map(coffees.map(({ id }) => {
  const count = savedBasket?.[id];
  return [id, Number.isInteger(count) && count > 0 ? Math.min(count, 99) : 0];
}));

productGrid.innerHTML = coffees.map((coffee) => `
  <article class="product">
    <img src="assets/${coffee.image}" alt="${coffee.alt}" width="620" height="504" loading="lazy">
    <div class="product-copy">
      <p class="origin">${coffee.origin}</p><h3>${coffee.name}</h3>
      <p class="notes">${coffee.notes}</p>
      <div class="product-bottom"><span>${money(coffee.cents)} <small> / 250 g</small></span>
        <button class="add" type="button" data-add="${coffee.id}" aria-label="Añadir ${coffee.name} a la cesta">+</button>
      </div>
    </div>
  </article>`).join("");

function renderBasket() {
  const items = coffees.filter(({ id }) => quantities.get(id) > 0);
  bagCount.textContent = items.reduce((sum, { id }) => sum + quantities.get(id), 0);
  document.querySelector("#basket-total").textContent = money(items.reduce((sum, { id, cents }) => sum + quantities.get(id) * cents, 0));
  basketItems.innerHTML = items.length ? items.map(({ id, name, cents }) => `
    <div class="basket-row">
      <span>${quantities.get(id)} × ${name}</span>
      <span>${money(quantities.get(id) * cents)}</span>
      <button type="button" data-remove="${id}" aria-label="Quitar una unidad de ${name}">−</button>
    </div>`).join("") : "<p>Tu cesta está vacía.</p>";
}

function changeQuantity(id, delta) {
  const count = quantities.get(id);
  const coffee = coffees.find((item) => item.id === id);
  if (delta > 0 && count === 99) {
    notice.textContent = "Ya tienes 99 unidades de este café.";
    return;
  }
  quantities.set(id, count + delta);
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(quantities)));
  } catch {
    // The basket remains usable for this visit if storage is unavailable.
  }
  renderBasket();
  notice.textContent = delta > 0 ? `${coffee.name} añadido a la cesta.` : `Una unidad de ${coffee.name} eliminada.`;
}

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) changeQuantity(button.dataset.add, 1);
});
basketItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  changeQuantity(button.dataset.remove, -1);
  const remainingButton = [...basketItems.querySelectorAll("[data-remove]")].find((item) => item.dataset.remove === button.dataset.remove);
  (remainingButton ?? basketItems.querySelector("button") ?? document.querySelector("#close-bag")).focus();
});
document.querySelector("#open-bag").addEventListener("click", () => basket.showModal());
document.querySelector("#close-bag").addEventListener("click", () => basket.close());
renderBasket();

const places = document.querySelector("#places");
const pins = document.querySelector("#map-pins");
const directions = document.querySelector("#map-directions");

cafes.forEach((cafe, index) => {
  const number = index + 1;
  const item = document.createElement("li");
  item.innerHTML = `<button class="place" type="button" aria-pressed="false"><span class="place-number" aria-hidden="true">${number}</span>
    <span><strong>${cafe.name}</strong><small>${cafe.address} · ${cafe.neighborhood}</small></span></button>`;
  places.append(item);

  const pin = document.createElement("button");
  pin.type = "button";
  pin.className = "pin";
  pin.style.left = `${cafe.x}%`;
  pin.style.top = `${cafe.y}%`;
  pin.textContent = number;
  pin.setAttribute("aria-label", cafe.name);
  pins.append(pin);

  item.firstElementChild.addEventListener("click", () => selectPlace(index));
  pin.addEventListener("click", () => selectPlace(index));
});

function selectPlace(index) {
  cafes.forEach((_, position) => {
    const pressed = String(position === index);
    places.children[position].firstElementChild.setAttribute("aria-pressed", pressed);
    pins.children[position].setAttribute("aria-pressed", pressed);
  });
  const { name, address } = cafes[index];
  const query = new URLSearchParams({ api: "1", query: `${name}, ${address}, Madrid` });
  directions.href = `https://www.google.com/maps/search/?${query}`;
  directions.setAttribute("aria-label", `Cómo llegar a ${name} en Google Maps (abre una pestaña nueva)`);
}

selectPlace(0);

const canvas = document.querySelector("#map-canvas");
const map = canvas.getContext("2d");

function drawMap() {
  const { width, height } = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  map.setTransform(scale * width / 100, 0, 0, scale * height / 100, 0, 0);
  map.fillStyle = "#e5e9dd";
  map.fillRect(0, 0, 100, 100);

  function path(points) {
    map.beginPath();
    map.moveTo(...points[0]);
    points.slice(1).forEach((point) => map.lineTo(...point));
  }

  const parks = [
    [[0, 5], [12, 5], [18, 15], [14, 29], [0, 34]],
    [[78, 49], [100, 45], [100, 91], [88, 91], [78, 73]],
    [[0, 56], [14, 59], [19, 75], [13, 84], [0, 87]],
  ];
  map.fillStyle = "#cbd9be";
  parks.forEach((park) => {
    path(park);
    map.fill();
  });

  map.strokeStyle = "#f7f7ed";
  map.lineWidth = .53;
  for (let x = 5; x < 100; x += 5) {
    path([[x - 14, 0], [x - 5, 27], [x + 1, 51], [x - 3, 73], [x + 8, 100]]);
    map.stroke();
  }
  for (let y = 4; y < 100; y += 7) {
    path([[0, y + 2], [24, y - 5], [42, y + 1], [66, y + 4], [83, y - 3], [100, y - 4]]);
    map.stroke();
  }

  const avenues = [
    [[0, 41], [19, 36], [35, 39], [49, 46], [61, 44], [74, 35], [100, 31]],
    [[18, 100], [28, 73], [35, 59], [44, 52], [61, 44], [67, 19], [70, 0]],
    [[46, 0], [45, 20], [43, 38], [44, 52], [53, 72], [54, 100]],
    [[100, 78], [81, 73], [75, 68], [73, 51], [74, 35], [82, 15], [86, 0]],
  ];
  map.lineJoin = "round";
  avenues.forEach((avenue) => {
    path(avenue);
    map.strokeStyle = "#d7d4bd";
    map.lineWidth = 1.5;
    map.stroke();
    map.strokeStyle = "#fff9e6";
    map.lineWidth = 1.05;
    map.stroke();
  });

  map.setTransform(scale, 0, 0, scale, 0, 0);
  map.font = "600 11px 'DM Sans', sans-serif";
  map.fillStyle = "#47594a";
  map.textAlign = "center";
  const labels = [
    ["Conde Duque", 23, 20], ["Malasaña", 47, 15], ["Salesas", 74, 17],
    ["Gran Vía", 52, 43], ["Puerta del Sol", 44, 56], ["Las Letras", 59, 58],
    ["Lavapiés", 53, 86], ["El Retiro", 88, 64],
  ];
  labels.forEach(([name, x, y]) => map.fillText(name, width * x / 100, height * y / 100));
}

new ResizeObserver(drawMap).observe(canvas);
