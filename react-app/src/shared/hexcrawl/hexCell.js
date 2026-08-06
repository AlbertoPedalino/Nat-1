// One hex of a wilderness map, as the database stores it and as the map paints
// it. Pure, like scene.js: the cloud module converts rows through here so the
// editor never sees a raw column name.

import { hexKey } from '../vtt/hexGeometry.js';

// What the GM has marked a hex as. Deliberately about the party's progress
// through it, not about who lives there — population is its own column, because
// a settled hex can still be unexplored by these particular adventurers.
export const HEX_STATUSES = Object.freeze([
  'unexplored', 'scouted', 'travelled', 'settled', 'danger',
]);

// The colour is derived, never stored: re-theming the map must not mean
// rewriting every row a campaign has ever recorded. Unexplored has no tint at
// all — an untouched map should look like the picture underneath it.
export const HEX_STATUS_TONES = Object.freeze({
  unexplored: null,
  scouted: '#8f7a4a',
  travelled: '#6f8f5a',
  settled: '#4a6f8f',
  danger: '#a1503c',
});

export const HEX_STATUS_LABELS = Object.freeze({
  unexplored: 'Unexplored',
  scouted: 'Scouted',
  travelled: 'Travelled',
  settled: 'Settled',
  danger: 'Dangerous',
});

const MAX_NOTE = 400;

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeHexStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  return HEX_STATUSES.includes(status) ? status : 'unexplored';
}

// `travelled` is the one a campaign actually accumulates, so it is the one the
// GM can re-colour: a green wash reads as forest on some maps and as nothing at
// all on others. The rest keep their tones — they are marks, not the country.
export function hexStatusColor(status, travelledColor = null) {
  const normalized = normalizeHexStatus(status);
  if (normalized === 'travelled' && travelledColor) return travelledColor;
  return HEX_STATUS_TONES[normalized] || null;
}

export function toHexCell(row) {
  if (!row || row.q == null || row.r == null) return null;
  return {
    sceneId: row.scene_id || null,
    q: Math.round(Number(row.q) || 0),
    r: Math.round(Number(row.r) || 0),
    terrain: typeof row.terrain === 'string' ? row.terrain : null,
    tier: numberOrNull(row.tier),
    pop: typeof row.pop === 'string' ? row.pop : null,
    status: normalizeHexStatus(row.status),
    note: typeof row.note === 'string' ? row.note : '',
    revealed: Boolean(row.revealed),
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

// Columns a client may write. Coordinates are absent on purpose: they are the
// key, and a patch that moved a hex would mean something nobody can draw.
export const HEX_CELL_PATCH_KEYS = Object.freeze([
  'terrain', 'tier', 'pop', 'status', 'note', 'revealed',
]);

export function toHexCellPatch(patch) {
  const source = patch && typeof patch === 'object' ? patch : {};
  const row = {};
  for (const key of HEX_CELL_PATCH_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (key === 'status') row.status = normalizeHexStatus(source.status);
    else if (key === 'revealed') row.revealed = Boolean(source.revealed);
    else if (key === 'tier') row.tier = numberOrNull(source.tier);
    else if (key === 'note') row.note = String(source.note ?? '').slice(0, MAX_NOTE);
    else row[key] = source[key] ? String(source[key]).slice(0, 60) : null;
  }
  return row;
}

// What the overlay needs: a lookup by hex, with the colour already resolved.
// A Map rather than a list because painting asks per hex, once per frame.
export function hexCellsByKey(cells, { travelledColor = null } = {}) {
  const map = new Map();
  for (const cell of cells || []) {
    if (!cell) continue;
    const color = hexStatusColor(cell.status, travelledColor);
    map.set(hexKey({ q: cell.q, r: cell.r }), { ...cell, color });
  }
  return map;
}
