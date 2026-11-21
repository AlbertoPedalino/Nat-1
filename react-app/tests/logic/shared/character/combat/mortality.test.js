import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMortality, revive, withConsciousness } from '../../../../../src/shared/character/combat/mortality.js';

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

test('a character dropped to 0 HP falls Unconscious, and wakes still Prone when it regains hit points', () => {
  const down = withConsciousness({ player: true, hpBefore: 3, hp: 0, conditions: ['blinded'] });
  assert.deepEqual(down, ['blinded', 'incapacitated', 'prone', 'unconscious']);
  assert.deepEqual(withConsciousness({ player: true, hpBefore: 0, hp: 2, conditions: down }), ['blinded', 'prone']);
  // Another condition that imposes Incapacitated keeps it.
  assert.deepEqual(withConsciousness({ player: true, hpBefore: 0, hp: 2, conditions: [...down, 'stunned'] }), ['blinded', 'incapacitated', 'prone', 'stunned']);
});

test('consciousness changes only as hit points cross 0, and never for a monster or the dead', () => {
  // The GM cleared Unconscious while the character lay at 0: it stays cleared.
  assert.deepEqual(withConsciousness({ player: true, hpBefore: 0, hp: 0, conditions: ['prone'] }), ['prone']);
  assert.deepEqual(withConsciousness({ player: true, hpBefore: 0, hp: 4, conditions: ['incapacitated'] }), ['incapacitated']);
  assert.deepEqual(withConsciousness({ player: false, hpBefore: 5, hp: 0, conditions: [] }), []);
  assert.deepEqual(withConsciousness({ player: true, hpBefore: 5, hp: 0, conditions: ['dead'] }), ['dead']);
  // An unknown previous HP is an undamaged creature.
  assert.ok(withConsciousness({ player: true, hpBefore: null, hp: 0, conditions: [] }).includes('unconscious'));
});

test('a character brought back from Dead comes round', () => {
  const back = revive({ player: true, deathSaves: { success: 0, fail: 3 }, conditions: ['dead', 'incapacitated', 'prone', 'unconscious'] });
  assert.deepEqual(back.conditions, ['prone']);
});
