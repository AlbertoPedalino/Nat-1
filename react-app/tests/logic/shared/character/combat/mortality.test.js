import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMortality } from '../../../../../src/shared/character/combat/mortality.js';

test('a monster is dead at 0 HP; a character only with three failed saves or the Dead condition', () => {
  assert.equal(resolveMortality({ player: false, hp: 0, conditions: [] }).dead, true);
  assert.equal(resolveMortality({ player: true, hp: 0, deathSaves: { success: 1, fail: 2 }, conditions: [] }).dead, false);
  assert.equal(resolveMortality({ player: true, hp: 0, deathSaves: { success: 0, fail: 3 }, conditions: [] }).dead, true);
  assert.equal(resolveMortality({ player: true, hp: 0, deathSaves: null, conditions: ['dead'] }).dead, true);
  assert.equal(resolveMortality({ player: true, hp: 4, deathSaves: { success: 0, fail: 3 }, conditions: ['dead'] }).dead, false);
});

test('the Dead condition follows the result, and a dead character shows three failed saves in the current shape', () => {
  const dead = resolveMortality({ player: true, hp: 0, deathSaves: { s: 2, f: 1 }, conditions: ['dead'] });
  assert.deepEqual(dead.deathSaves, { success: 2, fail: 3 });
  assert.ok(dead.conditions.includes('dead'));
  const alive = resolveMortality({ player: true, hp: 5, deathSaves: { success: 1, fail: 1 }, conditions: ['dead', 'prone'] });
  assert.deepEqual(alive.conditions, ['prone']);
  assert.deepEqual(alive.deathSaves, { success: 1, fail: 1 });
});
