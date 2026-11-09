import { useCallback, useState } from 'react';
import { getStorageItem, setStorageItem } from '../storage/storage.js';

// A yes/no preference of this device, kept across reloads (a strip folded, a
// floating control hidden): [value, setValue], setValue taking a value or an
// updater like useState's.
export function useStoredFlag(key, fallback = false) {
  const [value, setValue] = useState(() => {
    const raw = getStorageItem(key);
    return raw == null ? fallback : raw === '1';
  });
  const set = useCallback((next) => {
    setValue((current) => {
      const resolved = typeof next === 'function' ? next(current) : next;
      setStorageItem(key, resolved ? '1' : '0');
      return resolved;
    });
  }, [key]);
  return [value, set];
}
