import { stripRuntimeOnlyCharacterFields } from './runtimeFields.js';

const CHAR_KEY = (id) => `gb:char:${id}`;
// Sync bookkeeping kept beside the sheet, never inside it: the cloud
// `sheet_revision` this local copy was last aligned with, and how many local
// edits were made (`editVersion`) versus how many the cloud has
// (`syncedVersion`). Lets a local sheet tell, across reloads, whether it holds
// changes the cloud does not have, and which revision its next save expects.
const SYNC_KEY = (id) => `gb:char-sync:${id}`;
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
    // An older copy may still carry runtime-only fields; they are never read back.
    return stripRuntimeOnlyCharacterFields(JSON.parse(localStorage.getItem(CHAR_KEY(id)))) || null;
  } catch {
    return null;
  }
}

export function saveCharacter(id, character, options = {}) {
  if (!id || !character) return null;
  const { emit = true } = options;
  const now = Date.now();
  const next = {
    ...stripRuntimeOnlyCharacterFields(character),
    id,
    createdAt: character.createdAt || now,
    updatedAt: now,
  };
  localStorage.setItem(CHAR_KEY(id), JSON.stringify(next));
  upsertIndex(id, next.name);
  // Notify any cloud auto-sync listener that this character changed locally.
  // A save that is not a local edit (a copy of the cloud) passes emit: false.
  if (emit) {
    const meta = getCharacterSyncMeta(id);
    writeSyncMeta(id, { ...meta, editVersion: meta.editVersion + 1 });
    try {
      window.dispatchEvent(new CustomEvent('gb:char-saved', { detail: { id } }));
    } catch (_) {}
  }
  return next;
}

export function patchCharacter(id, patch, options = {}) {
  if (!id) return null;
  const current = loadCharacter(id);
  if (!current) return null;
  return saveCharacter(id, { ...current, ...patch }, options);
}

export function deleteCharacter(id) {
  if (!id) return;
  localStorage.removeItem(CHAR_KEY(id));
  localStorage.removeItem(SYNC_KEY(id));
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

function writeSyncMeta(id, meta) {
  try { localStorage.setItem(SYNC_KEY(id), JSON.stringify(meta)); } catch (_) {}
}

export function getCharacterSyncMeta(id) {
  let raw = null;
  try { raw = id ? JSON.parse(localStorage.getItem(SYNC_KEY(id))) : null; } catch (_) { raw = null; }
  const revision = Number(raw?.sheetRevision);
  return {
    sheetRevision: raw?.sheetRevision == null || !Number.isFinite(revision) ? null : revision,
    editVersion: Math.max(0, Number(raw?.editVersion) || 0),
    syncedVersion: Math.max(0, Number(raw?.syncedVersion) || 0),
  };
}

// The local copy has edits the cloud has not acknowledged yet.
export function hasUnsyncedLocalChanges(id) {
  const meta = getCharacterSyncMeta(id);
  return meta.editVersion > meta.syncedVersion;
}

// The cloud now holds this local copy up to `syncedVersion` (the edit version
// read before the push; defaults to every edit so far), at `sheetRevision`.
export function markCharacterSynced(id, sheetRevision, syncedVersion = null) {
  if (!id) return;
  const meta = getCharacterSyncMeta(id);
  const upTo = syncedVersion == null ? meta.editVersion : Math.min(meta.editVersion, syncedVersion);
  writeSyncMeta(id, {
    ...meta,
    sheetRevision: sheetRevision == null ? meta.sheetRevision : Number(sheetRevision),
    syncedVersion: Math.max(meta.syncedVersion, upTo),
  });
}

// Base the next save on `sheetRevision` without acknowledging local edits: the
// user chose to keep their changes over that cloud version.
export function rebaseCharacterSync(id, sheetRevision) {
  if (!id || sheetRevision == null) return;
  writeSyncMeta(id, { ...getCharacterSyncMeta(id), sheetRevision: Number(sheetRevision) });
}
