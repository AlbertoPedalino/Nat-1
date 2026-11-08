import test from 'node:test';
import assert from 'node:assert/strict';
import { rollVisibility } from '../../../../../src/shared/cloud/sync/rollVisibility.js';

test('who sees a roll: players always, the GM by their switch, table rolls the GM only', () => {
  assert.equal(rollVisibility('player', false), 'public');
  assert.equal(rollVisibility('player', true), 'public');
  assert.equal(rollVisibility('gm', false), 'gm');
  assert.equal(rollVisibility('gm', true), 'public');
  assert.equal(rollVisibility('table', true), 'gm');
  assert.equal(rollVisibility('table', false), 'gm');
});
