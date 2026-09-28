import { normalizeNoteSize } from '../notes/notes.js';
import { readInstanceValue, saveLocal } from '../../../shared/instances/instanceStore.js';

// DM Screen payload adapter: which keys a screen stores and how they are
// (de)serialized. Registry, sync and opening are shared (shared/instances/);
// every write goes through saveLocal, which skips unchanged values.

const SECTION_KEY = 'dmscreen';
export const NOTES_STORAGE_KEY = 'notes:v2';
// v1 had no per-note size; it is read once and rewritten as v2 on the next save.
export const LEGACY_NOTES_STORAGE_KEY = 'notes:v1';
export const NOTES_VERSION = 2;
export const LEGACY_NOTES_VERSION = 1;

export function makeNoteId(now = Date.now(), random = Math.random) {
  return `note_${now.toString(36)}_${random().toString(36).slice(2, 8)}`;
}

export function scopeKey(id, key = NOTES_STORAGE_KEY) {
  return `gb:dmscreen:${id}:${key}`;
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
    const stored = readInstanceValue(SECTION_KEY, id, NOTES_STORAGE_KEY);
    const current = readNotesPayload(stored, NOTES_VERSION);
    if (current) return current;
    if (stored != null) return [];
    return readNotesPayload(readInstanceValue(SECTION_KEY, id, LEGACY_NOTES_STORAGE_KEY), LEGACY_NOTES_VERSION) || [];
  } catch {
    return [];
  }
}

// The v1 key is deliberately left in place: reads always prefer v2, and
// deleting the screen wipes the whole `gb:dmscreen:<id>:` prefix. Returns
// false when the write failed (quota/denied); nothing is then half-written.
export function persistNotes(id, notes) {
  const payload = {
    version: NOTES_VERSION,
    notes: notes.map(({ id: noteId, title, body, size }) => ({
      id: noteId,
      title,
      body,
      size: normalizeNoteSize(size),
    })),
  };
  try {
    saveLocal(SECTION_KEY, id, { [NOTES_STORAGE_KEY]: JSON.stringify(payload) });
    return true;
  } catch {
    return false;
  }
}
