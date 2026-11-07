import test from 'node:test';
import assert from 'node:assert/strict';
import { viewportEdits } from '../../../../../src/pages/vtt/scene/viewportEdits.js';

test('the player preview blocks every editing prop of the viewport', () => {
  const live = { onDragToken: () => {}, canMove: () => true, placementDrag: { kind: 'object' }, rolls: 'button' };
  assert.equal(viewportEdits(false, live), live);
  const blocked = viewportEdits(true, live);
  assert.deepEqual(Object.keys(blocked), Object.keys(live));
  assert.equal(blocked.onDragToken, undefined);
  assert.equal(blocked.canMove({ id: 't' }), false);
  assert.equal(blocked.placementDrag, null);
  assert.equal(blocked.rolls, null);
});
