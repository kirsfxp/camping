const KEY = 'camping-bookings-v1';

export function loadBookings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('Invalid data');
    return parsed;
  } catch (e) {
    console.error('Ошибка чтения localStorage:', e);
    return [];
  }
}

export function saveBookings(bookings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(bookings));
    return true;
  } catch (e) {
    console.error('Ошибка сохранения в localStorage:', e);
    return false;
  }
}

export function clearBookings() {
  try {
    localStorage.removeItem(KEY);
    return true;
  } catch (e) {
    return false;
  }
}