// Pure scene/token rules, shared by the cloud module and (later) the editor.
// No Supabase import here on purpose: this is the part that stays testable with
// plain `node --test`.

import { normalizeEffects } from '../character/combatEffects.js';
import { normalizeConditions } from '../character/conditions.js';
import { normalizeFog } from './fog.js';

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
export const TOKEN_PATCH_KEYS = Object.freeze([
  'x', 'y', 'w', 'h', 'z', 'label', 'color', 'image_path', 'image_url', 'conditions',
  'hp_current', 'hp_max', 'source_ref', 'show_hp', 'effects',
]);

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

// The part of the scene that is in play, in cells. Anything outside it is the
// GM's staging area, and RLS keeps it off the players' wire — this mirrors
// map_token_in_play so the editor can dim what it already knows is private.
export function normalizePlayArea(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Math.round(numberOr(value.x, 0));
  const y = Math.round(numberOr(value.y, 0));
  const w = Math.round(numberOr(value.w, 0));
  const h = Math.round(numberOr(value.h, 0));
  // A zero-width area would hide the entire map, which is never what someone
  // dragging a handle meant.
  if (w < 1 || h < 1) return null;
  return { x, y, w, h };
}

// Mirrors the SQL: the origin cell decides, so a creature straddling the edge is
// in or out by the square it stands on rather than by a majority of its bulk.
export function isTokenInPlay(token, playArea) {
  if (!playArea) return true;
  const x = numberOr(token?.x, 0);
  const y = numberOr(token?.y, 0);
  return x >= playArea.x
    && y >= playArea.y
    && x < playArea.x + playArea.w
    && y < playArea.y + playArea.h;
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
    backgroundPath: row.background_path || null,
    // Which picture the table is looking at. The other one stays uploaded.
    shownImage: row.shown_image === 'background' ? 'background' : 'map',
    grid: normalizeGrid(row.grid),
    // null is "this scene has no fog", not "everything is hidden".
    fog: normalizeFog(row.fog),
    // The scene the players are currently shown. Only one per campaign.
    isLive: Boolean(row.is_live),
    playArea: normalizePlayArea(row.play_area),
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
    imageUrl: row.image_url || null,
    // "<instance>:<fight>:<combatant>" for an imported piece, so the GM's own
    // browser can match it back to the encounter it came from.
    sourceRef: row.source_ref || null,
    // Bars are opt-in per piece: a board covered in them is noise.
    showHp: Boolean(row.show_hp),
    // Who put the piece down; a player may move and remove their own.
    createdBy: row.created_by || null,
    hpCurrent: Number.isFinite(Number(row.hp_current)) && row.hp_current !== null ? Number(row.hp_current) : null,
    hpMax: Number.isFinite(Number(row.hp_max)) && row.hp_max !== null ? Number(row.hp_max) : null,
    conditions: normalizeConditions(row.conditions),
    // Advantage/disadvantage rulings, same shape as a combatant's in the
    // encounter builder.
    effects: normalizeEffects(row.effects),
    // Filled from map_token_secrets, which only a GM can read at all.
    secretLabel: typeof row.secretLabel === 'string' ? row.secretLabel : '',
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
    if (key === 'conditions') row.conditions = normalizeConditions(source.conditions);
    else if (key === 'effects') row.effects = normalizeEffects(source.effects);
    else if (key === 'color') row.color = normalizeColor(source.color);
    else if (key === 'label') row.label = String(source.label ?? '').slice(0, 60);
    else if (key === 'image_path') row.image_path = source.image_path || null;
    else if (key === 'image_url') row.image_url = source.image_url || null;
    else if (key === 'source_ref') row.source_ref = source.source_ref || null;
    else if (key === 'show_hp') row.show_hp = Boolean(source.show_hp);
    else if (key === 'hp_current' || key === 'hp_max') {
      const value = Number(source[key]);
      row[key] = Number.isFinite(value) ? Math.round(value) : null;
    }
    else if (key === 'z') row.z = Math.round(numberOr(source.z, 0));
    else if (key === 'w' || key === 'h') row[key] = clamp(numberOr(source[key], 1), 0.1, MAX_SPAN);
    else row[key] = numberOr(source[key], 0);
  }
  return row;
}

// Mirrors the RLS update policy. The database is the authority; this only keeps
// the editor from offering a drag that would be rejected.
//
// `activeLayer` is an editing mode, not a permission: pieces on the layers you
// are not working in stay put, so dragging a background prop while arranging the
// party is impossible rather than merely careless. A player has no layer
// selector, so `null` means "whatever layer the piece is on".
export function canMoveToken(token, {
  isGm = false, ownedCharacterIds = [], activeLayer = null, userId = null,
} = {}) {
  if (!token) return false;
  if (activeLayer && token.layer !== activeLayer) return false;
  if (isGm) return true;
  if (token.layer === 'gm') return false;
  // Their own character's piece, or a marker they put down themselves.
  if (token.characterId) return ownedCharacterIds.includes(token.characterId);
  return Boolean(userId) && token.createdBy === userId;
}

// Who may flag a condition on a piece.
//
// A monster's conditions live on its own row and go through
// set_token_conditions, so anyone at the table may mark an enemy. A character's
// live on their sheet, and only its owner or the GM may write that — routing a
// player's click there would be a refusal from the database rather than a rule
// anybody agreed to. Marking somebody else's character is a thing the table says
// out loud, not a thing one player does to another's sheet.
export function canMarkToken(token, { isGm = false, ownedCharacterIds = [] } = {}) {
  if (!token) return false;
  if (isGm) return true;
  if (token.layer === 'gm') return false;
  if (token.characterId) return ownedCharacterIds.includes(token.characterId);
  return true;
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
