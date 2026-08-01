import { deleteCharacter, listCharacters, renameCharacter } from './character/store.js';

export const REGISTRY_META = {
  gb_board_registry: {
    label: 'GM Board',
    prefix: (id) => `gb:board:${id}:`,
    activeKey: 'gb_active_board_id',
    route: (id) => `/gmboard?board=${encodeURIComponent(id)}`,
    newRoute: '/gmboard?board=new',
  },
  gb_encounter_registry: {
    label: 'Encounter',
    prefix: (id) => `gb:enc:${id}:`,
    activeKey: 'gb_active_encounter_id',
    route: (id) => `/encounter-builder?enc=${encodeURIComponent(id)}`,
    newRoute: '/encounter-builder?enc=new',
  },
  gb_dmscreen_registry: {
    label: 'DM Screen',
    prefix: (id) => `gb:dmscreen:${id}:`,
    activeKey: 'gb_active_dmscreen_id',
    route: (id) => `/dm-screen?screen=${encodeURIComponent(id)}`,
    newRoute: '/dm-screen?screen=new',
  },
  gb_char_registry: {
    label: 'Personaggio',
    route: (id) => `/charsheet?char=${encodeURIComponent(id)}`,
    newRoute: '/charbuilder?char=new',
    custom: true,
  },
};

// `limit` is opt-in: omit it to read the full registry (the picker page and
// the rename/delete write-back path both need the whole list, else editing
// a registry beyond `limit` entries would silently drop the rest).
export function readRegistry(key, { limit } = {}) {
  let list;
  if (key === 'gb_char_registry') {
    list = listCharacters();
  } else {
    try {
      list = JSON.parse(localStorage.getItem(key) || '[]').filter((x) => x && x.id);
    } catch {
      list = [];
    }
  }
  return typeof limit === 'number' ? list.slice(0, limit) : list;
}

export function writeRegistry(key, list) {
  if (key === 'gb_char_registry') return;
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

export function getRegistryMeta(key) {
  return REGISTRY_META[key] || null;
}

export function deleteRegistryEntry(registryKey, id) {
  const meta = REGISTRY_META[registryKey];
  if (!meta) return false;
  if (!window.confirm(`Eliminare questo salvataggio ${meta.label} e tutti i suoi dati locali?`)) return false;

  if (registryKey === 'gb_char_registry') {
    deleteCharacter(id);
    return true;
  }

  const prefix = meta.prefix(id);
  Object.keys(localStorage)
    .filter((k) => k.startsWith(prefix))
    .forEach((k) => localStorage.removeItem(k));

  if (localStorage.getItem(meta.activeKey) === id) {
    localStorage.removeItem(meta.activeKey);
  }

  const next = readRegistry(registryKey).filter((entry) => entry.id !== id);
  writeRegistry(registryKey, next);
  return true;
}

export function renameRegistryEntry(registryKey, id, nextName) {
  const meta = REGISTRY_META[registryKey];
  if (!meta) return false;
  const name = nextName || prompt('Nome salvataggio', id);
  if (!name || !name.trim()) return false;

  if (registryKey === 'gb_char_registry') {
    renameCharacter(id, name.trim());
    return true;
  }

  const list = readRegistry(registryKey);
  const next = list.map((x) => x.id === id ? { ...x, name: name.trim(), updatedAt: Date.now() } : x);
  writeRegistry(registryKey, next);
  return true;
}
