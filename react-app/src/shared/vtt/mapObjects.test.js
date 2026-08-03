import test from 'node:test';
import assert from 'node:assert/strict';
import { isMapPiece, mapObjectLabel, normalizeMapObjectKey, normalizeMapObjectStroke } from './mapObjects.js';

test('only a Lucide catalog name survives normalization', () => {
  assert.equal(normalizeMapObjectKey('door-open'), 'door-open');
  assert.equal(normalizeMapObjectKey(' DOOR-OPEN '), 'door-open');
  assert.equal(normalizeMapObjectKey('<svg onload=alert(1)>'), null);
  assert.equal(normalizeMapObjectKey('a'.repeat(81)), null);
  assert.equal(mapObjectLabel('door-open'), 'Door Open');
});

test('the stroke width stays inside the slider it came from', () => {
  assert.equal(normalizeMapObjectStroke(0), 0.5);
  assert.equal(normalizeMapObjectStroke(10), 4);
  assert.equal(normalizeMapObjectStroke('nonsense'), 1.8);
});

test('scenery is an icon or an uploaded picture, never a creature', () => {
  assert.equal(isMapPiece({ iconKey: 'door-open' }), true);
  assert.equal(isMapPiece({ imagePath: 'camp/scene/rug.png' }), true);
  // Bestiary art arrives as a remote URL on a creature's own piece: that is a
  // monster with a portrait, not a picture laid on the map.
  assert.equal(isMapPiece({ imageUrl: 'https://example.test/ogre.png' }), false);
  assert.equal(isMapPiece({ label: 'Ogre' }), false);
  assert.equal(isMapPiece({ characterId: 'aria', imagePath: 'camp/scene/aria.png' }), false);
  assert.equal(isMapPiece(null), false);
});
