import test from 'node:test';
import assert from 'node:assert/strict';
import { makeId } from '../../../src/shared/ids.js';

test('an id is prefix, time and random part, in letters, digits and underscores', () => {
  assert.equal(makeId('c', { now: 36 ** 2, random: () => 0.5 }), 'c_100_i0000000');
  assert.match(makeId('link'), /^link_[a-z0-9]+_[a-z0-9]{8}$/);
  assert.match(makeId(), /^[a-z0-9]+_[a-z0-9]{8}$/);
});

test('ids made one after another differ', () => {
  const ids = new Set(Array.from({ length: 200 }, () => makeId('roll')));
  assert.equal(ids.size, 200);
});

test('a camera source id is a valid source', async () => {
  const { createCameraSourceId, normalizeCameraSource } = await import('../../../src/shared/vtt/session/cameraSync.js');
  const id = createCameraSourceId();
  assert.equal(normalizeCameraSource(id), id);
});
