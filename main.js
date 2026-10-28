import { campsites } from './data.js';
import { loadBookings, saveBookings, clearBookings } from './storage.js';

const FAV_KEY = 'camping-favorites-v1';

const state = {
  selectedId: null,
  filterGuests: 0,
  filterPrice: Infinity,
  sortPrice: 'default', 
  favorites: [],        
  bookings: [],
  lang: 'ru'
};

const schemeContainer = document.getElementById('scheme');
const listContainer = document.getElementById('list');
const cardContainer = document.getElementById('card-container');
const bookingsContainer = document.getElementById('bookings-list');
const clearBookingsBtn = document.getElementById('clear-bookings');
const storageMessage = document.getElementById('storage-message');

try {
  const savedFavs = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]');
  if (Array.isArray(savedFavs)) {
    state.favorites = savedFavs.filter(id => campsites.some(c => c.id === id));
  }
} catch (e) {}

const langBtn = document.getElementById('lang-btn');
langBtn.addEventListener('click', () => {
  state.lang = state.lang === 'ru' ? 'en' : 'ru';
  document.documentElement.lang = state.lang;
  
  document.querySelectorAll('[data-en]').forEach(el => {
    if (state.lang === 'en') {
      el.dataset.ru = el.innerHTML; 
      el.innerHTML = el.dataset.en;
    } else {
      el.innerHTML = el.dataset.ru; 
    }
  });

  const paperText = document.querySelector('.paper-para');
  if (state.lang === 'en') {
    paperText.innerHTML = '<strong>About the place</strong><br>Tired of the city bustle, you go to the shore of Lake Ladoga, where pines touch the sky, and granite rocks keep silence. Choose your camping spot and book it.';
  } else {
    paperText.innerHTML = '<strong>О месте</strong><br>Устав от городской суеты, вы отправляетесь на берег Ладожского озера, где сосны касаются неба, а гранитные скалы хранят тишину. Выберите своё место для палатки и забронируйте его.';
  }

  const priceInput = document.getElementById('filter-price');
  if (state.lang === 'en') {
    priceInput.placeholder = priceInput.dataset.enPlaceholder;
  } else {
    priceInput.placeholder = 'Например, 3000';
  }

  langBtn.textContent = state.lang === 'en' ? 'Ru' : 'Eng';
  langBtn.dataset.en = state.lang === 'en' ? 'Ru' : 'Eng';

  render();
});

function init() {
  const saved = loadBookings();
  const validIds = campsites.map(c => c.id);
  state.bookings = saved.filter(b => 
    b && typeof b.id === 'string' && validIds.includes(b.itemId) && 
    Number.isInteger(b.guests) && Number.isInteger(b.nights) && b.total > 0
  );
  render();
}

function isOccupied(id) {
  const site = campsites.find(c => c.id === id);
  if (!site) return false;
  if (site.initiallyOccupied) return true;
  return state.bookings.some(b => b.itemId === id);
}

function getVisibleItems() {
  let items = campsites.filter(item => {
    const guestsMatch = item.capacity >= state.filterGuests;
    const priceMatch = item.price <= state.filterPrice;
    return guestsMatch && priceMatch;
  });

  if (state.sortPrice === 'asc') {
    items.sort((a, b) => a.price - b.price);
  } else if (state.sortPrice === 'desc') {
    items.sort((a, b) => b.price - a.price);
  }

  return items;
}

function render() {
  const visibleItems = getVisibleItems();
  const selectedItem = visibleItems.find(c => c.id === state.selectedId);
  
  if (state.selectedId && !selectedItem) {
    state.selectedId = null;
    storageMessage.textContent = state.lang === 'en' 
      ? 'The selected place is hidden by filters. Selection reset.' 
      : 'Выбранное место скрыто фильтрами. Выбор сброшен.';
  }

  renderScheme(visibleItems);
  renderList(visibleItems);
  renderCard(selectedItem);
  renderBookings();
}

function renderScheme(visibleItems) {
  schemeContainer.innerHTML = '';
  const icons = ['⛺️', '🏕️', '🔥', '🎣', '🧭', '🪵', '🌲', '🛶'];
  
  visibleItems.forEach((item, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'map-btn';
    btn.style.left = `${item.x}%`;
    btn.style.top = `${item.y}%`;
    
    const isSel = item.id === state.selectedId;
    const isOcc = isOccupied(item.id);
    
    btn.setAttribute('aria-pressed', String(isSel));
    btn.disabled = isOcc;
    
    if (isOcc) btn.classList.add('occupied');
    if (isSel) btn.classList.add('selected');
    
    const originalIndex = campsites.findIndex(c => c.id === item.id);
    const icon = icons[originalIndex % icons.length];
    
    const name = state.lang === 'en' ? (item.name_en || item.name) : item.name;
    
    btn.innerHTML = `
      <span class="map-icon">${icon}</span>
      <span class="map-label">${name}</span>
    `;
    
    btn.addEventListener('click', () => {
      if (!isOcc) {
        state.selectedId = item.id;
        render();
      }
    });
    schemeContainer.appendChild(btn);
  });
}

function renderList(visibleItems) {
  listContainer.innerHTML = '';
  if (visibleItems.length === 0) {
    listContainer.innerHTML = `<p class="placeholder" style="display:block;">${state.lang === 'en' ? 'Nothing found. Change filters.' : 'Ничего не найдено. Измените фильтры.'}</p>`;
    return;
  }
  
  visibleItems.forEach(item => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'list-item';
    
    const isSel = item.id === state.selectedId;
    const isOcc = isOccupied(item.id);
    
    btn.setAttribute('aria-pressed', String(isSel));
    btn.disabled = isOcc;
    
    if (isOcc) btn.classList.add('occupied');
    if (isSel) btn.classList.add('selected');
    
    const name = state.lang === 'en' ? (item.name_en || item.name) : item.name;
    const desc = state.lang === 'en' ? (item.desc_en || item.desc) : item.desc;
    const statusText = isOcc 
      ? (state.lang === 'en' ? 'Occupied' : 'Занят') 
      : (isSel ? (state.lang === 'en' ? 'Selected' : 'Выбран') : (state.lang === 'en' ? 'Free' : 'Свободен'));
    
    btn.innerHTML = `
      <div class="list-item-info">
        <strong>${name}</strong>
        <span>${desc}</span>
      </div>
      <div class="list-item-meta">
        <span>${item.capacity} ${state.lang === 'en' ? 'guests' : 'гостей'}</span>
        <span>${item.price} ₽/${state.lang === 'en' ? 'night' : 'ночь'}</span>
        <span class="status-text">${statusText}</span>
      </div>
    `;
    
    btn.addEventListener('click', () => {
      if (!isOcc) {
        state.selectedId = item.id;
        render();
      }
    });
    listContainer.appendChild(btn);
  });
}

function renderCard(item) {
  if (!item) {
    cardContainer.innerHTML = '';
    return;
  }
  
  if (isOccupied(item.id)) {
    cardContainer.innerHTML = `<p class="placeholder" style="display:block;">${state.lang === 'en' ? 'This place is already occupied.' : 'Это место уже занято.'}</p>`;
    return;
  }

  const name = state.lang === 'en' ? (item.name_en || item.name) : item.name;
  const desc = state.lang === 'en' ? (item.desc_en || item.desc) : item.desc;
  const isFav = state.favorites.includes(item.id);

  cardContainer.innerHTML = `
    <div class="card">
      <div class="card-header">
        <h2>${name}</h2>
        <button type="button" class="btn-fav ${isFav ? 'active' : ''}" id="fav-btn" aria-label="Toggle favorite">
          ${isFav ? '❤️' : '🤍'}
        </button>
      </div>
      <p class="card-desc">${desc}</p>
      <p class="card-price">${item.price} ₽ / ${state.lang === 'en' ? 'night' : 'ночь'}</p>
      <p class="card-capacity">${state.lang === 'en' ? 'Capacity: up to' : 'Вместимость: до'} ${item.capacity} ${state.lang === 'en' ? 'guests' : 'гостей'}</p>
      
      <form id="booking-form" class="booking-form" novalidate>
        <div class="form-group">
          <label for="input-guests">${state.lang === 'en' ? 'Guests' : 'Гостей'} (1-${item.capacity}):</label>
          <input type="number" id="input-guests" min="1" max="${item.capacity}" value="1" required>
        </div>
        <div class="form-group">
          <label for="input-nights">${state.lang === 'en' ? 'Nights' : 'Ночей'} (1-30):</label>
          <input type="number" id="input-nights" min="1" max="30" value="1" required>
        </div>
        <p class="total-price">${state.lang === 'en' ? 'Total' : 'Итого'}: <span id="total-sum">${item.price}</span> ₽</p>
        <button type="submit" class="btn-primary">${state.lang === 'en' ? 'Book' : 'Забронировать'}</button>
        <p class="error-msg" id="form-error" role="alert"></p>
      </form>
    </div>
  `;

  document.getElementById('fav-btn').addEventListener('click', () => {
    if (state.favorites.includes(item.id)) {
      state.favorites = state.favorites.filter(id => id !== item.id);
    } else {
      state.favorites.push(item.id);
    }
    localStorage.setItem(FAV_KEY, JSON.stringify(state.favorites));
    render(); 
  });

  const form = document.getElementById('booking-form');
  const inputGuests = document.getElementById('input-guests');
  const inputNights = document.getElementById('input-nights');
  const totalSum = document.getElementById('total-sum');
  const errorMsg = document.getElementById('form-error');

  function updateTotal() {
    const n = parseInt(inputNights.value, 10);
    if (Number.isInteger(n) && n >= 1 && n <= 30) {
      totalSum.textContent = item.price * n;
    } else {
      totalSum.textContent = '—';
    }
  }

  inputNights.addEventListener('input', updateTotal);
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    errorMsg.textContent = '';
    
    const guests = parseInt(inputGuests.value, 10);
    const nights = parseInt(inputNights.value, 10);
    
    if (!Number.isInteger(guests) || guests < 1 || guests > item.capacity) {
      errorMsg.textContent = state.lang === 'en' ? `Guests must be from 1 to ${item.capacity}.` : `Гостей должно быть от 1 до ${item.capacity}.`;
      return;
    }
    if (!Number.isInteger(nights) || nights < 1 || nights > 30) {
      errorMsg.textContent = state.lang === 'en' ? 'Nights must be from 1 to 30.' : 'Ночей должно быть от 1 до 30.';
      return;
    }
    
    if (isOccupied(item.id)) {
      errorMsg.textContent = state.lang === 'en' ? 'This place was just taken.' : 'Это место только что заняли.';
      render();
      return;
    }
    
    const total = item.price * nights;
    const newBooking = {
      id: 'b-' + Date.now(),
      itemId: item.id,
      itemName: name,
      guests: guests,
      nights: nights,
      total: total
    };
    
    state.bookings.push(newBooking);
    const savedOk = saveBookings(state.bookings);
    if (!savedOk) {
      storageMessage.textContent = state.lang === 'en' ? 'Failed to save booking. It works until refresh.' : 'Не удалось сохранить бронь. Она действует до обновления.';
    } else {
      storageMessage.textContent = state.lang === 'en' ? 'Booking successfully saved!' : 'Бронь успешно сохранена!';
    }
    
    state.selectedId = null;
    render();
  });
}

function renderBookings() {
  bookingsContainer.innerHTML = '';
  if (state.bookings.length === 0) {
    bookingsContainer.innerHTML = `<p class="placeholder" style="display:block;">${state.lang === 'en' ? 'You have no bookings yet.' : 'У вас пока нет броней.'}</p>`;
    clearBookingsBtn.hidden = true;
    return;
  }
  
  clearBookingsBtn.hidden = false;
  
  state.bookings.forEach(b => {
    const div = document.createElement('div');
    div.className = 'booking-item';
    div.innerHTML = `
      <div>
        <strong>${b.itemName}</strong>
        <p>${b.guests} ${state.lang === 'en' ? 'guests' : 'гостей'}, ${b.nights} ${state.lang === 'en' ? 'nights' : 'ночей'}. ${state.lang === 'en' ? 'Total' : 'Итого'}: ${b.total} ₽</p>
      </div>
      <button type="button" class="btn-cancel" data-id="${b.id}">${state.lang === 'en' ? 'Cancel' : 'Отменить'}</button>
    `;
    bookingsContainer.appendChild(div);
  });

  bookingsContainer.querySelectorAll('.btn-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const bookingId = e.target.dataset.id;
      state.bookings = state.bookings.filter(b => b.id !== bookingId);
      saveBookings(state.bookings);
      render();
    });
  });
}

document.getElementById('filter-guests').addEventListener('change', (e) => {
  state.filterGuests = parseInt(e.target.value, 10);
  render();
});

document.getElementById('filter-price').addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  state.filterPrice = isNaN(val) ? Infinity : val;
  render();
});

document.getElementById('sort-price').addEventListener('change', (e) => {
  state.sortPrice = e.target.value;
  render();
});

document.getElementById('reset-filters').addEventListener('click', () => {
  document.getElementById('filter-guests').value = '0';
  document.getElementById('filter-price').value = '';
  document.getElementById('sort-price').value = 'default';
  state.filterGuests = 0;
  state.filterPrice = Infinity;
  state.sortPrice = 'default';
  render();
});

clearBookingsBtn.addEventListener('click', () => {
  const msg = state.lang === 'en' ? 'Are you sure you want to cancel all your bookings?' : 'Вы уверены, что хотите отменить все свои брони?';
  if (confirm(msg)) {
    if (clearBookings()) {
      state.bookings = [];
      storageMessage.textContent = state.lang === 'en' ? 'All your bookings are cancelled.' : 'Все ваши брони отменены.';
      render();
    }
  }
});

init();