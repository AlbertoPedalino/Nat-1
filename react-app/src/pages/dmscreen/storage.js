import { normalizeNoteSize } from './logic/notes.js';
import {
  emitStorageEvent,
  restoreScopedPayload,
  snapshotScopedPayload,
  touchRegistryEntry,
} from '../../shared/scopedStoragePayload.js';
import { SECTION_REGISTRY } from '../../shared/sectionRegistry.js';
import { normalizeLinkGroupId } from '../../shared/linkGroupId.js';

const SECTION = SECTION_REGISTRY.dmscreen;
export const REGISTRY_KEY = SECTION.registryKey;
export const ACTIVE_KEY = SECTION.activeKey;
export const NOTES_STORAGE_KEY = 'notes:v2';
// v1 had no per-note size; it is read once and rewritten as v2 on the next save.
export const LEGACY_NOTES_STORAGE_KEY = 'notes:v1';
export const NOTES_VERSION = 2;
export const LEGACY_NOTES_VERSION = 1;
const SAVE_EVENT = SECTION.saveEvent;

export function sanitizeId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 48);
}

export function makeId(now = Date.now(), random = Math.random) {
  return `screen_${now.toString(36)}_${random().toString(36).slice(2, 7)}`;
}

export function makeNoteId(now = Date.now(), random = Math.random) {
  return `note_${now.toString(36)}_${random().toString(36).slice(2, 8)}`;
}

export function scopeKey(id, key = NOTES_STORAGE_KEY) {
  return `gb:dmscreen:${id}:${key}`;
}

export function scopedPrefix(id) {
  return SECTION.scopedPrefix(id);
}

export function readRegistry() {
  try {
    const value = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]');
    return Array.isArray(value) ? value.filter((entry) => entry && entry.id).slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function writeRegistry(list) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify((Array.isArray(list) ? list : []).slice(0, 20)));
    return true;
  } catch {
    return false;
  }
}

export function hasScopedData(id) {
  const prefix = `gb:dmscreen:${id}:`;
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      if (String(localStorage.key(index) || '').startsWith(prefix)) return true;
    }
  } catch {}
  return false;
}

export function isKnownInstance(id) {
  return readRegistry().some((entry) => entry.id === id) || hasScopedData(id);
}

export function registerInstance(id, label, { force = false, linkGroupId } = {}) {
  const cleanId = sanitizeId(id);
  if (!cleanId) return null;
  const now = Date.now();
  const list = readRegistry();
  const existing = list.find((entry) => entry.id === cleanId);
  const name = !force && existing?.name
    ? existing.name
    : (String(label || '').trim() || cleanId);
  const entry = {
    ...existing,
    id: cleanId,
    name,
    updatedAt: now,
    ...(linkGroupId ? { linkGroupId: normalizeLinkGroupId(linkGroupId) } : {}),
  };
  const next = [entry, ...list.filter((item) => item.id !== cleanId)].slice(0, 20);
  let previousRegistry = null;
  try {
    previousRegistry = localStorage.getItem(REGISTRY_KEY);
  } catch {}
  if (!writeRegistry(next)) return null;
  try {
    localStorage.setItem(ACTIVE_KEY, cleanId);
  } catch {
    // Roll the registry back: a listed entry that never became active would
    // still show up on Home as a screen this save failed to create.
    restoreRegistry(previousRegistry);
    return null;
  }
  return entry;
}

function restoreRegistry(raw) {
  try {
    if (raw == null) localStorage.removeItem(REGISTRY_KEY);
    else localStorage.setItem(REGISTRY_KEY, raw);
  } catch {}
}

export function resolveInstance(search, idFactory = makeId) {
  const params = new URLSearchParams(search || '');
  const requested = sanitizeId(params.get('screen'));
  let linkGroupId = normalizeLinkGroupId(params.get('linkGroup'));

  if (requested === 'new') {
    return { id: idFactory(), saved: false, replaceSearch: '', ...(linkGroupId ? { linkGroupId } : {}) };
  }

  if (requested) {
    linkGroupId = readRegistry().find((entry) => entry.id === requested)?.linkGroupId || linkGroupId;
    const group = normalizeLinkGroupId(linkGroupId);
    return { id: requested, saved: isKnownInstance(requested), replaceSearch: '', ...(group ? { linkGroupId: group } : {}) };
  }

  let activeId = '';
  try {
    activeId = sanitizeId(localStorage.getItem(ACTIVE_KEY));
  } catch {}
  if (activeId && isKnownInstance(activeId)) {
    const group = normalizeLinkGroupId(readRegistry().find((entry) => entry.id === activeId)?.linkGroupId);
    return {
      id: activeId,
      saved: true,
      replaceSearch: `?screen=${encodeURIComponent(activeId)}`,
      ...(group ? { linkGroupId: group } : {}),
    };
  }

  const id = idFactory();
  return { id, saved: false, replaceSearch: `?screen=${encodeURIComponent(id)}`, ...(linkGroupId ? { linkGroupId } : {}) };
}

function isValidNotesPayload(value, version) {
  if (!value || value.version !== version || !Array.isArray(value.notes)) return false;
  const ids = new Set();
  return value.notes.every((note) => {
    if (!note || typeof note.id !== 'string' || !note.id || typeof note.title !== 'string' || typeof note.body !== 'string') return false;
    if (ids.has(note.id)) return false;
    ids.add(note.id);
    return true;
  });
}

// Sizes are normalized rather than validated: a note with a missing or absurd
// size is still readable content, unlike a malformed id/title/body.
function readNotesPayload(raw, version) {
  if (raw == null) return null;
  const value = JSON.parse(raw);
  if (!isValidNotesPayload(value, version)) return null;
  return value.notes.map(({ id: noteId, title, body, size }) => ({
    id: noteId,
    title,
    body,
    size: normalizeNoteSize(size),
  }));
}

export function readPersistedNotes(id) {
  try {
    const current = readNotesPayload(localStorage.getItem(scopeKey(id)), NOTES_VERSION);
    if (current) return current;
    if (localStorage.getItem(scopeKey(id)) != null) return [];
    return readNotesPayload(
      localStorage.getItem(scopeKey(id, LEGACY_NOTES_STORAGE_KEY)),
      LEGACY_NOTES_VERSION,
    ) || [];
  } catch {
    return [];
  }
}

export function persistNotes(id, notes) {
  try {
    const payload = {
      version: NOTES_VERSION,
      notes: notes.map(({ id: noteId, title, body, size }) => ({
        id: noteId,
        title,
        body,
        size: normalizeNoteSize(size),
      })),
    };
    localStorage.setItem(scopeKey(id), JSON.stringify(payload));
    // The v1 key is deliberately left in place: deleting it here would make a
    // rolled-back save destroy the only copy of the notes. Reads always prefer
    // v2, and deleting the screen wipes the whole `gb:dmscreen:<id>:` prefix.
    markScreenPersisted(id);
    return true;
  } catch {
    return false;
  }
}

export function persistNotesIfSaved(id, saved, notes) {
  return saved ? persistNotes(id, notes) : false;
}

export function clearPersistedNotes(id) {
  try {
    localStorage.removeItem(scopeKey(id));
    localStorage.removeItem(scopeKey(id, LEGACY_NOTES_STORAGE_KEY));
    return true;
  } catch {
    return false;
  }
}

// Saving is all-or-nothing: the notes payload lands first, and a failed registry
// write rolls it back. Registering first would leave Home listing a screen whose
// notes never made it to storage (quota/denied write), which reloads as an empty
// board even though the page reported the save as failed.
export function saveInstanceWithNotes(id, label, notes, options) {
  const cleanId = sanitizeId(id);
  if (!cleanId) return null;
  const hadNotes = localStorageHasKey(scopeKey(cleanId))
    || localStorageHasKey(scopeKey(cleanId, LEGACY_NOTES_STORAGE_KEY));
  if (!persistNotes(cleanId, notes)) return null;
  const entry = registerInstance(cleanId, label, options);
  if (!entry) {
    if (!hadNotes) clearPersistedNotes(cleanId);
    return null;
  }
  emitStorageEvent(SAVE_EVENT, cleanId);
  return entry;
}

export function readScopedPayload(id) {
  return snapshotScopedPayload(scopedPrefix(id));
}

export function writeScopedPayload(id, payload, { name, updatedAt, linkGroupId } = {}) {
  restoreScopedPayload(scopedPrefix(id), payload);
  return touchRegistryEntry(REGISTRY_KEY, id, { name, updatedAt, linkGroupId });
}

function markScreenPersisted(id) {
  if (!touchRegistryEntry(REGISTRY_KEY, id)) return;
  emitStorageEvent(SAVE_EVENT, id);
}

function localStorageHasKey(key) {
  try {
    return localStorage.getItem(key) != null;
  } catch {
    return false;
  }
}
