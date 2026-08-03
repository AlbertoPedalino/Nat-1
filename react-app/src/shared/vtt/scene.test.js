import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GRID,
  LAYERS,
  TOKEN_PATCH_KEYS,
  campaignIdFromImagePath,
  canMarkToken,
  canMoveToken,
  isTokenInPlay,
  mapImageFolder,
  mapImagePath,
  normalizePlayArea,
  normalizeGrid,
  normalizeLayer,
  sanitizeName,
  toScene,
  toToken,
  toTokenPatch,
} from './scene.js';

test('grid calibration is clamped and folded into a single cell', () => {
  assert.deepEqual(normalizeGrid(null), DEFAULT_GRID);
  assert.equal(normalizeGrid({ size: 2 }).size, 8);
  assert.equal(normalizeGrid({ size: 9999 }).size, 512);
  assert.equal(normalizeGrid({ size: 50, offsetX: 50 }).offsetX, 0);
  assert.equal(normalizeGrid({ size: 50, offsetX: 60 }).offsetX, 10);
  assert.equal(normalizeGrid({ size: 50, offsetY: -10 }).offsetY, 40);
  assert.equal(normalizeGrid({ visible: false }).visible, false);
  assert.equal(normalizeGrid({ size: 'nonsense' }).size, DEFAULT_GRID.size);
});

test('an unknown layer falls back to tokens, never to gm', () => {
  assert.deepEqual(LAYERS, ['map', 'tokens', 'gm']);
  assert.equal(normalizeLayer('gm'), 'gm');
  assert.equal(normalizeLayer('secret'), 'tokens');
  assert.equal(normalizeLayer(undefined), 'tokens');
});

test('rows become editor shapes with usable numbers', () => {
  const scene = toScene({
    id: 's1',
    campaign_id: 'c1',
    name: '  Cripta   dei  Re  ',
    image_path: 'c1/s1/map.png',
    grid: { size: 64, offsetX: 12 },
    updated_at: '2026-08-02T10:00:00.000Z',
  });
  assert.equal(scene.name, 'Cripta dei Re');
  assert.equal(scene.grid.size, 64);
  assert.equal(scene.fog, null, 'a scene without fog is not a scene in darkness');
  assert.equal(scene.updatedAt, Date.parse('2026-08-02T10:00:00.000Z'));
  assert.equal(toScene(null), null);

  const token = toToken({
    id: 't1', scene_id: 's1', layer: 'bogus', x: '3.5', w: 999, color: '#AABBCC', icon_key: 'door-open', icon_stroke_width: 3.2, rotation: -45,
  });
  assert.equal(token.layer, 'tokens');
  assert.equal(token.x, 3.5);
  assert.equal(token.w, 40, 'span is clamped');
  assert.equal(token.color, '#aabbcc');
  assert.equal(token.label, '');
  assert.equal(token.iconKey, 'door-open');
  assert.equal(token.iconStrokeWidth, 3.2);
  assert.equal(token.rotation, 315);
});

// The patch allowlist is the guard that keeps the client from sending columns
// RLS will reject: layer and character_id are the GM's business only.
test('a token patch drops everything outside the allowlist', () => {
  const patch = toTokenPatch({
    x: 4,
    y: '5',
    layer: 'gm',
    character_id: 'someone-else',
    scene_id: 'other-scene',
    id: 'spoofed',
    color: 'not-a-color',
    label: 'x'.repeat(200),
  });
  assert.deepEqual(Object.keys(patch).sort(), ['color', 'label', 'x', 'y']);
  assert.equal(patch.x, 4);
  assert.equal(patch.y, 5);
  assert.equal(patch.color, null);
  assert.equal(patch.label.length, 60);
  assert.equal(TOKEN_PATCH_KEYS.includes('layer'), false);
  assert.equal(TOKEN_PATCH_KEYS.includes('character_id'), false);
});

test('an empty patch stays empty so no pointless update is sent', () => {
  assert.deepEqual(toTokenPatch({}), {});
  assert.deepEqual(toTokenPatch(null), {});
});

test('map object patches store only safe Lucide-style keys and normalized rotation', () => {
  assert.deepEqual(toTokenPatch({ icon_key: 'door-open' }), { icon_key: 'door-open' });
  assert.deepEqual(toTokenPatch({ icon_stroke_width: 9 }), { icon_stroke_width: 4 });
  assert.deepEqual(toTokenPatch({ icon_stroke_width: 0 }), { icon_stroke_width: 0.5 });
  assert.deepEqual(toTokenPatch({ icon_key: '<svg onload=alert(1)>' }), { icon_key: null });
  assert.deepEqual(toTokenPatch({ rotation: 450 }), { rotation: 90 });
});

// Mirrors the RLS update policy in supabase/vtt.sql. If one changes, this test
// is the reminder that the other has to follow.
test('only the GM moves anything; a player moves their own character token', () => {
  const mine = { id: 't1', layer: 'tokens', characterId: 'char-mine' };
  const theirs = { id: 't2', layer: 'tokens', characterId: 'char-theirs' };
  const loose = { id: 't3', layer: 'tokens', characterId: null };
  const secret = { id: 't4', layer: 'gm', characterId: 'char-mine' };
  const player = { isGm: false, ownedCharacterIds: ['char-mine'] };

  assert.equal(canMoveToken(mine, player), true);
  assert.equal(canMoveToken(theirs, player), false);
  assert.equal(canMoveToken(loose, player), false);
  assert.equal(canMoveToken(secret, player), false, 'the GM layer is never a player concern');
  assert.equal(canMoveToken(secret, { isGm: true }), true);
  assert.equal(canMoveToken(null, { isGm: true }), false);
});

// Mirrors map_token_in_play in the SQL. If one changes the other has to follow,
// or the editor dims a piece the database is still sending.
test('the play area decides by the square a piece stands on', () => {
  const area = { x: 2, y: 1, w: 4, h: 3 };
  assert.equal(isTokenInPlay({ x: 2, y: 1 }, area), true, 'the top-left corner is inside');
  assert.equal(isTokenInPlay({ x: 5, y: 3 }, area), true, 'the last cell is inside');
  assert.equal(isTokenInPlay({ x: 6, y: 3 }, area), false, 'one past the width is outside');
  assert.equal(isTokenInPlay({ x: 5, y: 4 }, area), false, 'one past the height is outside');
  assert.equal(isTokenInPlay({ x: 1, y: 1 }, area), false);
  assert.equal(isTokenInPlay({ x: -50, y: -50 }, area), false, 'the staging area is outside');
  // No area means the whole scene is in play, not that nothing is.
  assert.equal(isTokenInPlay({ x: 999, y: 999 }, null), true);
});

test('a play area with no extent is treated as none at all', () => {
  assert.deepEqual(normalizePlayArea({ x: 1, y: 2, w: 3, h: 4 }), { x: 1, y: 2, w: 3, h: 4 });
  assert.equal(normalizePlayArea({ x: 0, y: 0, w: 0, h: 5 }), null, 'zero width would hide the map');
  assert.equal(normalizePlayArea({ x: 0, y: 0, w: 5, h: -1 }), null);
  assert.equal(normalizePlayArea(null), null);
  assert.equal(normalizePlayArea('nope'), null);
  assert.deepEqual(normalizePlayArea({ x: 1.6, y: 0, w: 2.4, h: 2 }), { x: 2, y: 0, w: 2, h: 2 });
});

// Layers are an editing mode: what you are not working on cannot be nudged by
// accident, not even by the GM.
test('the active layer locks every piece that is not on it', () => {
  const prop = { id: 't1', layer: 'map', characterId: null };
  const piece = { id: 't2', layer: 'tokens', characterId: 'char-mine' };

  assert.equal(canMoveToken(prop, { isGm: true, activeLayer: 'map' }), true);
  assert.equal(canMoveToken(prop, { isGm: true, activeLayer: 'tokens' }), false);
  assert.equal(canMoveToken(piece, { isGm: true, activeLayer: 'tokens' }), true);
  assert.equal(canMoveToken(piece, { isGm: true, activeLayer: 'gm' }), false);

  // A player has no layer selector: the piece's own layer is the only rule.
  assert.equal(canMoveToken(piece, { isGm: false, ownedCharacterIds: ['char-mine'] }), true);
});

// A marker a player put down is theirs to move and pick up; one somebody else
// placed is not.
test('a player owns the markers they placed themselves', () => {
  const mine = { id: 't1', layer: 'tokens', characterId: null, createdBy: 'me' };
  const theirs = { id: 't2', layer: 'tokens', characterId: null, createdBy: 'someone' };
  const secret = { id: 't3', layer: 'gm', characterId: null, createdBy: 'me' };

  assert.equal(canMoveToken(mine, { userId: 'me' }), true);
  assert.equal(canMoveToken(theirs, { userId: 'me' }), false);
  assert.equal(canMoveToken(secret, { userId: 'me' }), false);
  assert.equal(canMoveToken(mine, {}), false, 'no signed-in user means no ownership');
});

// Marking is the one write anyone may make on a piece they can see, enemies
// included — it goes through the RPC, not the row policy.
test('anyone at the table may set conditions on what they can see', () => {
  assert.equal(canMarkToken({ layer: 'tokens' }, { isGm: false }), true);
  assert.equal(canMarkToken({ layer: 'map' }, { isGm: false }), true);
  assert.equal(canMarkToken({ layer: 'gm' }, { isGm: false }), false);
  assert.equal(canMarkToken({ layer: 'gm' }, { isGm: true }), true);
  assert.equal(canMarkToken(null, { isGm: true }), false);
});

// A monster's conditions are its own row and go through the RPC; a character's
// are on their sheet, which only the owner and the GM may write. Offering the
// chips on somebody else's character would produce a refusal from the database,
// not a rule anyone agreed to.
test('a character can be marked by its owner or the GM, not by the rest of the party', () => {
  const mine = { layer: 'tokens', characterId: 'char-mine' };
  const theirs = { layer: 'tokens', characterId: 'char-theirs' };
  const monster = { layer: 'tokens', characterId: null };
  const player = { isGm: false, ownedCharacterIds: ['char-mine'] };

  assert.equal(canMarkToken(mine, player), true);
  assert.equal(canMarkToken(theirs, player), false);
  assert.equal(canMarkToken(monster, player), true, 'enemies stay markable by anyone');
  assert.equal(canMarkToken(theirs, { isGm: true }), true);
});

// Storage policies read the first folder of the path to find the campaign, so
// the campaign id has to lead and survive a round trip.
test('map image paths lead with the campaign id and sanitize the file name', () => {
  const path = mapImagePath('c1', 's1', 'Cripta Dei Re!!.PNG', 0);
  assert.match(path, /^c1\/s1\/0-cripta-dei-re-\.png$/);
  assert.equal(campaignIdFromImagePath(path), 'c1');
  assert.equal(mapImagePath(null, 's1', 'a.png'), null);
  assert.equal(mapImagePath('c1', null, 'a.png'), null);
  assert.equal(mapImageFolder('c1', 's1'), 'c1/s1');
  assert.equal(mapImageFolder('c1/../../other', 's1'), null);
  assert.equal(mapImageFolder('c1', ''), null);
  assert.equal(campaignIdFromImagePath(''), null);
});

test('scene names are trimmed with a fallback', () => {
  assert.equal(sanitizeName('   '), 'Scene');
  assert.equal(sanitizeName(null, 'Mappa'), 'Mappa');
  assert.equal(sanitizeName('a'.repeat(200)).length, 80);
});
