// Local character ids that are NOT mine but that I'm allowed to edit (a global
// GM, or the GM of the sheet's campaign). For these, auto-sync updates the cloud
// row's data only — it must never change `owner` or insert a new row.
const KEY = 'gb:cloud_foreign';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch (_) {
    return {};
  }
}

function write(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map)); } catch (_) {}
}

function notify(id, foreign) {
  try {
    window.dispatchEvent(new CustomEvent('gb:cloud-foreign-changed', { detail: { id, foreign } }));
  } catch (_) {}
}

export function isForeignEdit(id) {
  if (!id) return false;
  return Boolean(read()[id]);
}

export function markForeignEdit(id) {
  if (!id) return;
  const map = read();
  map[id] = true;
  write(map);
  notify(id, true);
}

export function unmarkForeignEdit(id) {
  if (!id) return;
  const map = read();
  delete map[id];
  write(map);
  notify(id, false);
}
