import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptFogDelta, newFogStroke } from '../../../../../src/shared/vtt/map/fogStream.js';

test('frames of a stroke are accepted in order; a gap stops that stroke only', () => {
  const streams = new Map();
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'a', seq: 0 }), true);
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'a', seq: 1 }), true);
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'a', seq: 3 }), false);
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'a', seq: 4 }), false);
  // Another painter is unaffected; the next stroke starts clean.
  assert.equal(acceptFogDelta(streams, 'co-gm', { stroke: 'x', seq: 0 }), true);
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'b', seq: 0 }), true);
});

test('joining mid-stroke, or a malformed frame, waits for the snapshot', () => {
  const streams = new Map();
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'a', seq: 5 }), false);
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'a', seq: 6 }), false);
  assert.equal(acceptFogDelta(streams, 'gm', { seq: 0 }), false);
  assert.equal(acceptFogDelta(streams, 'gm', { stroke: 'c', seq: -1 }), false);
  assert.notEqual(newFogStroke(), newFogStroke());
});

test('a client that predates deltas drops the frame harmlessly', async () => {
  // Older handleRemoteDrag falls through to putGhost for any payload it does
  // not recognise; without a token id that is a no-op.
  const { putGhost } = await import('../../../../../src/shared/vtt/session/liveScene.js');
  const ghosts = { piece: { x: 1, y: 1 } };
  assert.equal(putGhost(ghosts, { fogDelta: { stroke: 'a', seq: 0, on: [0, 1] }, actor: 'gm' }), ghosts);
});
