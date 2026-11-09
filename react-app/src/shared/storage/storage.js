// This browser's localStorage, or null where it is missing or denied.
export function getStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (_) {
    return null;
  }
}

const APP_STORAGE_PREFIXES = ['gb:', 'gb_', '5e_', 'gm_'];

export function isAppLocalStorageKey(key) {
  return APP_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
}

// Every key that starts with `prefix`; none when storage is blocked.
export function listStorageKeys(prefix = '') {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (typeof key === 'string' && key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  } catch (_) {
    return [];
  }
}

export function listAppLocalStorageKeys() {
  return listStorageKeys().filter(isAppLocalStorageKey);
}

export function clearAppLocalStorage() {
  const keys = listAppLocalStorageKeys();
  keys.forEach((key) => {
    try {
      getStorage()?.removeItem(key);
    } catch (_) {}
  });
  return keys.length;
}

export function getStorageItem(key, fallback = null) {
  try {
    const storage = getStorage();
    const value = storage?.getItem(key);
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

export function setStorageItem(key, value) {
  try {
    getStorage()?.setItem(key, String(value));
  } catch (_) {}
}

// A JSON value: `fallback` when it is missing, unreadable or storage is
// blocked. Preferences and small caches read this way; a blocked storage only
// forgets.
// A stored JSON string read back, or `fallback` when it is missing, not a
// string, unreadable or null.
export function parseJsonOr(raw, fallback) {
  if (typeof raw !== 'string') return fallback;
  try {
    const value = JSON.parse(raw);
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

export function getStorageJson(key, fallback = null) {
  return parseJsonOr(getStorageItem(key), fallback);
}

export function setStorageJson(key, value) {
  try {
    setStorageItem(key, JSON.stringify(value));
  } catch (_) {}
}

export function removeStorageItem(key) {
  try {
    getStorage()?.removeItem(key);
  } catch (_) {}
}

// The data stores (characters, tool instances) write through these two: a
// write that does not fit, or a blocked storage, throws, so the store can roll
// back what it had half written. Everything else uses the forgiving functions
// above, where a blocked storage only forgets.
export function writeStorageItemStrict(key, value) {
  requireStorage().setItem(key, String(value));
}

export function removeStorageItemStrict(key) {
  requireStorage().removeItem(key);
}

function requireStorage() {
  const storage = getStorage();
  if (!storage) throw new Error('Local storage is not available in this browser.');
  return storage;
}
