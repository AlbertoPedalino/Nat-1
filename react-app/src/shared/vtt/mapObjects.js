// A map object stores only the kebab-case Lucide name. Rendering resolves that
// name through Lucide's own dynamic catalog; arbitrary markup and image bytes
// can therefore never enter the token row.
const LUCIDE_KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DEFAULT_MAP_OBJECT_STROKE = 1.8;
export const MIN_MAP_OBJECT_STROKE = 0.5;
export const MAX_MAP_OBJECT_STROKE = 4;

export function normalizeMapObjectStroke(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAP_OBJECT_STROKE;
  return Math.min(MAX_MAP_OBJECT_STROKE, Math.max(MIN_MAP_OBJECT_STROKE, parsed));
}

export function normalizeMapObjectKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return key.length <= 80 && LUCIDE_KEY_RE.test(key) ? key : null;
}

// Furniture rather than a creature: a Lucide object, or a picture the GM
// uploaded onto the map. Both are rectangles that get the resize and rotate
// handles, and both are what the grid-snap switch governs — a character or a
// bestiary piece keeps its square whatever that switch says, because a creature
// off-grid is a ruling argument nobody wants mid-fight.
export function isMapPiece(token) {
  if (!token || token.characterId) return false;
  return Boolean(token.iconKey) || Boolean(token.imagePath);
}

export function mapObjectLabel(key) {
  return String(normalizeMapObjectKey(key) || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
