function getStorage() {
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

export function listAppLocalStorageKeys() {
  try {
    const storage = getStorage();
    if (!storage) return [];
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && isAppLocalStorageKey(key)) keys.push(key);
    }
    return keys;
  } catch (_) {
    return [];
  }
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
export function getStorageJson(key, fallback = null) {
  const raw = getStorageItem(key);
  if (raw == null) return fallback;
  try {
    const value = JSON.parse(raw);
    return value == null ? fallback : value;
  } catch (_) {
    return fallback;
  }
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
