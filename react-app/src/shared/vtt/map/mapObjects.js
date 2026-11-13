import { titleCase } from '../../ui/textCase.js';
import { clamp } from '../../numbers.js';
// A map object stores only a kebab-case name: a Lucide icon's, or a game
// drawing's after `game:` (MAP_OBJECT_DRAWINGS in shared/ui/gameIcons.js).
// Rendering resolves the name through Lucide's own dynamic catalog or that
// list; arbitrary markup and image bytes can therefore never enter the token
// row.
export const GAME_DRAWING_PREFIX = 'game:';
const MAP_OBJECT_KEY_RE = /^(?:game:)?[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DEFAULT_MAP_OBJECT_STROKE = 1.8;
export const MIN_MAP_OBJECT_STROKE = 0.5;
export const MAX_MAP_OBJECT_STROKE = 4;

export function normalizeMapObjectStroke(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_MAP_OBJECT_STROKE;
  return clamp(parsed, MIN_MAP_OBJECT_STROKE, MAX_MAP_OBJECT_STROKE);
}

export function normalizeMapObjectKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return key.length <= 80 && MAP_OBJECT_KEY_RE.test(key) ? key : null;
}

// Furniture rather than a creature: a Lucide object, or a picture the GM
// uploaded directly onto the map. The token maker also uploads its portrait to
// image_path, but gives the piece a colour for its ring; that colour is the
// durable distinction between a framed token and unframed scenery. Furniture
// gets resize/rotate handles, while a creature keeps its square.
export function isMapPiece(token) {
  if (!token || token.characterId) return false;
  return Boolean(token.iconKey) || (Boolean(token.imagePath) && !token.color);
}

export function mapObjectLabel(key) {
  const name = String(normalizeMapObjectKey(key) || '').replace(GAME_DRAWING_PREFIX, '');
  return titleCase(name.split('-').filter(Boolean).join(' '));
}
