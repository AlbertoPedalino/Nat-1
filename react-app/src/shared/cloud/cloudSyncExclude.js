// Character ids that must NOT auto-sync to the cloud (e.g. a sheet imported from
// a JSON file someone sent you — it stays local and is never pushed to your account).
const KEY = 'gb:cloud_nosync';

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

export function isSyncExcluded(id) {
  if (!id) return false;
  return Boolean(read()[id]);
}

export function excludeFromSync(id) {
  if (!id) return;
  const map = read();
  map[id] = true;
  write(map);
}

export function includeInSync(id) {
  if (!id) return;
  const map = read();
  delete map[id];
  write(map);
}
