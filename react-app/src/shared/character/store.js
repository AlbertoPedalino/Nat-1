const CHAR_KEY = (id) => `gb:char:${id}`;
const INDEX_KEY = 'gb:chars';
const ACTIVE_KEY = 'gb:active_char';

export function getActiveCharId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveCharId(id) {
  if (id) localStorage.setItem(ACTIVE_KEY, id);
  else localStorage.removeItem(ACTIVE_KEY);
}

export function listCharacters() {
  try {
    const list = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]');
    return Array.isArray(list) ? list.filter((e) => e && e.id) : [];
  } catch {
    return [];
  }
}

function writeIndex(list) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
}

function upsertIndex(id, name) {
  const list = listCharacters();
  const idx = list.findIndex((e) => e.id === id);
  const now = Date.now();
  const display = name || 'Character';
  if (idx === -1) {
    writeIndex([{ id, name: display, createdAt: now, updatedAt: now }, ...list]);
  } else {
    list[idx] = { ...list[idx], name: display, updatedAt: now };
    writeIndex(list);
  }
}

export function generateCharId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function loadCharacter(id) {
  if (!id) return null;
  try {
    return JSON.parse(localStorage.getItem(CHAR_KEY(id))) || null;
  } catch {
    return null;
  }
}

export function saveCharacter(id, character, options = {}) {
  if (!id || !character) return null;
  const { emit = true } = options;
  const now = Date.now();
  const next = {
    ...character,
    id,
    createdAt: character.createdAt || now,
    updatedAt: now,
  };
  localStorage.setItem(CHAR_KEY(id), JSON.stringify(next));
  upsertIndex(id, next.name);
  // Notify any cloud auto-sync listener that this character changed locally.
  if (emit) {
    try {
      window.dispatchEvent(new CustomEvent('gb:char-saved', { detail: { id } }));
    } catch (_) {}
  }
  return next;
}

export function patchCharacter(id, patch) {
  if (!id) return null;
  const current = loadCharacter(id);
  if (!current) return null;
  return saveCharacter(id, { ...current, ...patch });
}

export function deleteCharacter(id) {
  if (!id) return;
  localStorage.removeItem(CHAR_KEY(id));
  writeIndex(listCharacters().filter((e) => e.id !== id));
  if (getActiveCharId() === id) setActiveCharId(null);
  // Local delete only — the cloud copy is NOT removed (server deletion is an
  // explicit action in "My sheets"). Auto-sync uses this event just to cancel
  // any pending push for the removed id.
  try {
    window.dispatchEvent(new CustomEvent('gb:char-deleted', { detail: { id } }));
  } catch (_) {}
}

export function renameCharacter(id, name) {
  return patchCharacter(id, { name });
}

export function createCharacter(seed = {}) {
  const id = generateCharId();
  const now = Date.now();
  return saveCharacter(id, {
    ...seed,
    id,
    name: seed.name || 'New Character',
    createdAt: now,
    updatedAt: now,
  });
}
