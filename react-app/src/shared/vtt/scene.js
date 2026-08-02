// Pure scene/token rules, shared by the cloud module and (later) the editor.
// No Supabase import here on purpose: this is the part that stays testable with
// plain `node --test`.

export const LAYERS = Object.freeze(['map', 'tokens', 'gm']);
export const DEFAULT_GRID = Object.freeze({ size: 70, offsetX: 0, offsetY: 0, visible: true });

const MIN_CELL = 8;
const MAX_CELL = 512;
const MAX_SPAN = 40;
const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i;

// Columns a client is allowed to write on a token. The GM layer and the
// character link are deliberately absent: RLS rejects a player who touches
// them, and letting the editor send them by accident would turn a policy
// violation into a confusing runtime error.
export const TOKEN_PATCH_KEYS = Object.freeze(['x', 'y', 'w', 'h', 'z', 'label', 'color', 'image_path']);

function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function normalizeGrid(grid) {
  const source = grid && typeof grid === 'object' ? grid : {};
  const size = clamp(Math.round(numberOr(source.size, DEFAULT_GRID.size)), MIN_CELL, MAX_CELL);
  return {
    size,
    // Offsets are within one cell: an offset of exactly `size` is the same grid
    // shifted by a whole square, so it is folded back to keep calibration sane.
    offsetX: ((numberOr(source.offsetX, 0) % size) + size) % size,
    offsetY: ((numberOr(source.offsetY, 0) % size) + size) % size,
    visible: source.visible !== false,
  };
}

export function normalizeLayer(layer) {
  return LAYERS.includes(layer) ? layer : 'tokens';
}

export function normalizeColor(value) {
  const color = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR_RE.test(color) ? color.toLowerCase() : null;
}

export function sanitizeName(value, fallback = 'Scene') {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ');
  return name ? name.slice(0, 80) : fallback;
}

// Database row -> the shape the editor works with (camelCase, no nulls where a
// number is expected).
export function toScene(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    campaignId: row.campaign_id || null,
    name: sanitizeName(row.name),
    imagePath: row.image_path || null,
    grid: normalizeGrid(row.grid),
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

export function toToken(row) {
  if (!row?.id) return null;
  return {
    id: row.id,
    sceneId: row.scene_id || null,
    layer: normalizeLayer(row.layer),
    x: numberOr(row.x, 0),
    y: numberOr(row.y, 0),
    w: clamp(numberOr(row.w, 1), 0.1, MAX_SPAN),
    h: clamp(numberOr(row.h, 1), 0.1, MAX_SPAN),
    z: Math.round(numberOr(row.z, 0)),
    characterId: row.character_id || null,
    label: typeof row.label === 'string' ? row.label : '',
    color: normalizeColor(row.color),
    imagePath: row.image_path || null,
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

// Editor shape -> row columns, dropping anything not in the allowlist so a
// stray key never reaches the update statement.
export function toTokenPatch(patch) {
  const source = patch && typeof patch === 'object' ? patch : {};
  const row = {};
  for (const key of TOKEN_PATCH_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (key === 'color') row.color = normalizeColor(source.color);
    else if (key === 'label') row.label = String(source.label ?? '').slice(0, 60);
    else if (key === 'image_path') row.image_path = source.image_path || null;
    else if (key === 'z') row.z = Math.round(numberOr(source.z, 0));
    else if (key === 'w' || key === 'h') row[key] = clamp(numberOr(source[key], 1), 0.1, MAX_SPAN);
    else row[key] = numberOr(source[key], 0);
  }
  return row;
}

// Mirrors the RLS update policy. The database is the authority; this only keeps
// the editor from offering a drag that would be rejected.
export function canMoveToken(token, { isGm = false, ownedCharacterIds = [] } = {}) {
  if (!token) return false;
  if (isGm) return true;
  if (token.layer === 'gm' || !token.characterId) return false;
  return ownedCharacterIds.includes(token.characterId);
}

// Storage paths are `<campaign_id>/<scene_id>/<file>`: the policies read the
// first folder to decide who may write, so the campaign id must lead.
export function mapImagePath(campaignId, sceneId, fileName, now = Date.now()) {
  if (!campaignId || !sceneId) return null;
  const clean = String(fileName || '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(-60) || 'map';
  return `${campaignId}/${sceneId}/${now.toString(36)}-${clean}`;
}

export function campaignIdFromImagePath(path) {
  const [campaignId] = String(path || '').split('/');
  return campaignId || null;
}
