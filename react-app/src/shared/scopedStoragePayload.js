function scopedKeys(prefix, storage = localStorage) {
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (typeof key === 'string' && key.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

export function snapshotScopedPayload(prefix, storage = localStorage) {
  const payload = {};
  for (const key of scopedKeys(prefix, storage)) {
    const value = storage.getItem(key);
    if (value != null) payload[key] = value;
  }
  return payload;
}

export function restoreScopedPayload(prefix, payload, storage = localStorage) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid cloud section payload.');
  }
  const entries = Object.entries(payload);
  if (entries.some(([key, value]) => !key.startsWith(prefix) || typeof value !== 'string')) {
    throw new Error('Invalid cloud section payload.');
  }
  for (const key of scopedKeys(prefix, storage)) storage.removeItem(key);
  for (const [key, value] of entries) storage.setItem(key, value);
  return payload;
}

export function touchRegistryEntry(registryKey, id, { name, updatedAt = Date.now(), limit = 20 } = {}) {
  let list;
  try {
    const parsed = JSON.parse(localStorage.getItem(registryKey) || '[]');
    list = Array.isArray(parsed) ? parsed.filter((entry) => entry && entry.id) : [];
  } catch {
    list = [];
  }
  const existing = list.find((entry) => entry.id === id);
  if (!existing && name == null) return null;
  const entry = {
    ...(existing || {}),
    id,
    name: String(name ?? existing?.name ?? id),
    updatedAt: Number(updatedAt) || 0,
  };
  const next = [entry, ...list.filter((item) => item.id !== id)].slice(0, limit);
  localStorage.setItem(registryKey, JSON.stringify(next));
  return entry;
}

export function emitStorageEvent(name, id) {
  if (!name || !id) return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail: { id } }));
  } catch (_) {}
}
