import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_KEY, chosenToggles, isToggleOn, toggleChoice, toggleKeeps,
} from '../../../../src/shared/ui/toggleChoices.js';

test('several toggles go on at once; All clears them', () => {
  let values = [];
  assert.equal(isToggleOn(values, ALL_KEY), true);
  values = toggleChoice(values, 'action');
  values = toggleChoice(values, 'bonus');
  assert.deepEqual(values, ['action', 'bonus']);
  assert.equal(isToggleOn(values, ALL_KEY), false);
  assert.deepEqual(toggleChoice(values, 'action'), ['bonus']);
  assert.deepEqual(toggleChoice(values, ALL_KEY), []);
});

test('a list keeps what is of any chosen kind, everything with none', () => {
  assert.equal(toggleKeeps([], 'spell'), true);
  assert.equal(toggleKeeps(['spell', 'monster'], 'monster'), true);
  assert.equal(toggleKeeps(['spell'], 'item'), false);
});

test("an older one-at-a-time value reads as a list of one, 'all' as none", () => {
  assert.deepEqual(chosenToggles('weapon'), ['weapon']);
  assert.deepEqual(chosenToggles('all'), []);
  assert.equal(toggleKeeps('all', 'armor'), true);
});
