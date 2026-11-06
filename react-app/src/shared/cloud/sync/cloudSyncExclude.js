import { getStorageJson, setStorageJson } from '../../storage/storage.js';
// Character ids that must NOT auto-sync to the cloud (e.g. a sheet imported from
// a JSON file someone sent you — it stays local and is never pushed to your account).
const KEY = 'gb:cloud_nosync';

function read() {
  const obj = getStorageJson(KEY, {});
  return typeof obj === 'object' ? obj : {};
}

function write(map) {
  setStorageJson(KEY, map);
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
