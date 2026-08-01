import { BOARD_COLUMNS } from './layout.js';

export const MIN_NOTE_HEIGHT = 160;
export const MAX_NOTE_HEIGHT = 1200;
export const MAX_NOTE_COLS = BOARD_COLUMNS;
// A third of the board: wide enough to read, narrow enough that three notes fit
// side by side before anyone resizes anything.
export const DEFAULT_NOTE_COLS = 4;
// `height: 0` means "grow with the content", the size a note has until the GM
// resizes it by hand.
export const AUTO_NOTE_HEIGHT = 0;
export const DEFAULT_NOTE_SIZE = Object.freeze({ cols: DEFAULT_NOTE_COLS, height: AUTO_NOTE_HEIGHT });
// Pre-12-column notes stored `span` as 1..3 thirds of the board.
const LEGACY_SPAN_TO_COLS = BOARD_COLUMNS / 3;

function clampInt(value, min, max, fallback) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function normalizeNoteSize(size) {
  const legacySpan = size?.cols == null && size?.span != null
    ? Number(size.span) * LEGACY_SPAN_TO_COLS
    : null;
  const cols = clampInt(
    legacySpan == null ? size?.cols : legacySpan,
    1,
    MAX_NOTE_COLS,
    DEFAULT_NOTE_SIZE.cols,
  );
  const rawHeight = Math.round(Number(size?.height));
  const height = Number.isFinite(rawHeight) && rawHeight > 0
    ? Math.min(MAX_NOTE_HEIGHT, Math.max(MIN_NOTE_HEIGHT, rawHeight))
    : AUTO_NOTE_HEIGHT;
  return { cols, height };
}

export function createNote(id) {
  return { id: String(id), title: '', body: '', size: { ...DEFAULT_NOTE_SIZE } };
}

export function addNote(notes, note) {
  return [...notes, note];
}

export function updateNote(notes, id, field, value) {
  if (field !== 'title' && field !== 'body') return notes;
  let changed = false;
  const next = notes.map((note) => {
    if (note.id !== id || note[field] === value) return note;
    changed = true;
    return { ...note, [field]: String(value) };
  });
  return changed ? next : notes;
}

export function resizeNote(notes, id, size) {
  const nextSize = normalizeNoteSize(size);
  let changed = false;
  const next = notes.map((note) => {
    if (note.id !== id) return note;
    const current = normalizeNoteSize(note.size);
    if (current.cols === nextSize.cols && current.height === nextSize.height) return note;
    changed = true;
    return { ...note, size: nextSize };
  });
  return changed ? next : notes;
}

export function removeNote(notes, id) {
  const next = notes.filter((note) => note.id !== id);
  return next.length === notes.length ? notes : next;
}

export function moveNote(notes, id, offset) {
  const from = notes.findIndex((note) => note.id === id);
  const to = from + Number(offset);
  if (from < 0 || !Number.isInteger(to) || to < 0 || to >= notes.length) return notes;
  const next = [...notes];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

// Drag reorder inserts at a position instead of swapping neighbours, so a note
// dragged across the board lands where it was dropped.
export function moveNoteTo(notes, id, index) {
  const from = notes.findIndex((note) => note.id === id);
  if (from < 0) return notes;
  const to = clampInt(index, 0, notes.length - 1, from);
  if (to === from) return notes;
  const next = [...notes];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

// Pure drop-target math so the pointer handling stays a thin shell: picks the
// card whose centre is closest to the pointer, then decides whether the dragged
// note belongs before or after it.
export function resolveDropIndex(rects, point, fromIndex) {
  if (!Array.isArray(rects) || rects.length === 0) return fromIndex;
  let nearest = 0;
  let nearestDistance = Infinity;
  rects.forEach((rect, index) => {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = (point.x - centerX) ** 2 + (point.y - centerY) ** 2;
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = index;
    }
  });

  const rect = rects[nearest];
  const after = point.x > rect.left + rect.width / 2;
  let target = after ? nearest + 1 : nearest;
  // The dragged note still occupies its own slot, so dropping past it shifts
  // every later index down by one.
  if (Number.isInteger(fromIndex) && fromIndex < target) target -= 1;
  return Math.min(rects.length - 1, Math.max(0, target));
}

// Reordering is a visual change, so the live region has to say out loud where a
// note landed. Untitled notes are named by position, which is all a screen
// reader has to go on.
export function describeNotePosition(notes, id) {
  const index = notes.findIndex((note) => note.id === id);
  if (index < 0) return '';
  const label = String(notes[index].title || '').trim() || `Note ${index + 1}`;
  return `${label} moved to position ${index + 1} of ${notes.length}`;
}

export function hasNoteContent(note) {
  return Boolean(note && (String(note.title || '').trim() || String(note.body || '').trim()));
}
