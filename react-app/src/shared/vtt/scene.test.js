import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_GRID,
  LAYERS,
  TOKEN_PATCH_KEYS,
  campaignIdFromImagePath,
  canMoveToken,
  mapImagePath,
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

  const token = toToken({ id: 't1', scene_id: 's1', layer: 'bogus', x: '3.5', w: 999, color: '#AABBCC' });
  assert.equal(token.layer, 'tokens');
  assert.equal(token.x, 3.5);
  assert.equal(token.w, 40, 'span is clamped');
  assert.equal(token.color, '#aabbcc');
  assert.equal(token.label, '');
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

// Storage policies read the first folder of the path to find the campaign, so
// the campaign id has to lead and survive a round trip.
test('map image paths lead with the campaign id and sanitize the file name', () => {
  const path = mapImagePath('c1', 's1', 'Cripta Dei Re!!.PNG', 0);
  assert.match(path, /^c1\/s1\/0-cripta-dei-re-\.png$/);
  assert.equal(campaignIdFromImagePath(path), 'c1');
  assert.equal(mapImagePath(null, 's1', 'a.png'), null);
  assert.equal(mapImagePath('c1', null, 'a.png'), null);
  assert.equal(campaignIdFromImagePath(''), null);
});

test('scene names are trimmed with a fallback', () => {
  assert.equal(sanitizeName('   '), 'Scene');
  assert.equal(sanitizeName(null, 'Mappa'), 'Mappa');
  assert.equal(sanitizeName('a'.repeat(200)).length, 80);
});
