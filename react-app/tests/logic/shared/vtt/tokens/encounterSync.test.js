import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fightWithTokenVitals,
  makeSourceRef,
  parseSourceRef,
} from '../../../../../src/shared/vtt/tokens/encounterSync.js';

test('a source reference survives a round trip', () => {
  const ref = makeSourceRef('enc_1', 'fight_1', 3);
  assert.equal(ref, 'enc_1:fight_1:3');
  assert.deepEqual(parseSourceRef(ref), { instanceId: 'enc_1', fightId: 'fight_1', combatantId: '3' });
});

// A colon inside an id would shift every field after it and quietly point the
// token at the wrong combatant.
test('an id containing the separator is refused rather than mangled', () => {
  assert.equal(makeSourceRef('enc:1', 'fight_1', 3), null);
  assert.equal(makeSourceRef('enc_1', null, 3), null);
  assert.equal(makeSourceRef('enc_1', 'fight_1', null), null);
  assert.equal(parseSourceRef('too:many:parts:here'), null);
  assert.equal(parseSourceRef('enc_1::3'), null);
  assert.equal(parseSourceRef(''), null);
});

// Combatant id 0 is falsy and is the first combatant the encounter builder
// creates: dropping it would leave one creature permanently unsynced.
test('the first combatant, whose id is zero, is not lost', () => {
  assert.equal(makeSourceRef('enc_1', 'fight_1', 0), 'enc_1:fight_1:0');
  assert.deepEqual(parseSourceRef('enc_1:fight_1:0').combatantId, '0');
});

// Enemy vitals belong to the fight row. A cached fight, however different it
// is from the pieces, never produces a write for them.
test('a condition set on a character piece reaches its combatant', () => {
  const combatants = [{ id: 0, sourceId: 'char-1', hpCurrent: 9, hpMax: 22, isDead: false }];
  const next = fightWithTokenVitals(combatants, {
    characterId: 'char-1',
    hpCurrent: null,
    conditions: ['frightened'],
    effects: [],
  });
  assert.deepEqual(next[0].activeConditions, ['frightened']);
  assert.equal(next[0].hpCurrent, 9);
});

test('editing a piece writes back into the fight and keeps isDead honest', () => {
  const combatants = [{ id: 0, hpCurrent: 7, hpMax: 7, isDead: false }, { id: 1, hpCurrent: 5, hpMax: 5 }];
  const next = fightWithTokenVitals(combatants, { sourceRef: 'enc_1:f1:0', hpCurrent: 0, hpMax: 7 });
  assert.equal(next[0].hpCurrent, 0);
  assert.equal(next[0].isDead, true, 'a creature killed on the map must not be alive in the encounter');
  assert.equal(next[1], combatants[1], 'the others are untouched');

  const revived = fightWithTokenVitals(next, { sourceRef: 'enc_1:f1:0', hpCurrent: 4, hpMax: 7 });
  assert.equal(revived[0].isDead, false);
});

test('Dead set on the map kills creatures and completes a player death track', () => {
  const creature = fightWithTokenVitals(
    [{ id: 0, type: 'monster', hpCurrent: 7, hpMax: 7, activeConditions: [], isDead: false }],
    { sourceRef: 'enc_1:f1:0', hpCurrent: 0, hpMax: 7, conditions: ['dead'] },
  );
  assert.equal(creature[0].hpCurrent, 0);
  assert.equal(creature[0].isDead, true);
  assert.deepEqual(creature[0].activeConditions, ['dead']);

  const player = fightWithTokenVitals(
    [{
      id: 1,
      type: 'player',
      sourceId: 'char-1',
      hpCurrent: 8,
      hpMax: 20,
      deathSaves: { s: 0, f: 0 },
      activeConditions: [],
      isDead: false,
    }],
    {
      characterId: 'char-1',
      hpCurrent: 0,
      conditions: ['dead'],
      deathSaves: { success: 0, fail: 3 },
    },
  );
  assert.equal(player[0].isDead, true);
  assert.deepEqual(player[0].deathSaves, { s: 0, f: 3 });
});

// Returning null lets the caller skip the write and the event it would emit,
// which is what stops the two tabs echoing each other forever.
test('a write-back that changes nothing returns null', () => {
  const combatants = [{ id: 0, hpCurrent: 7, hpMax: 7, isDead: false }];
  assert.equal(fightWithTokenVitals(combatants, { sourceRef: 'enc_1:f1:0', hpCurrent: 7, hpMax: 7 }), null);
  assert.equal(fightWithTokenVitals(combatants, { sourceRef: null, hpCurrent: 1 }), null);
});

// Marking a piece prone touches no hit points at all. Refusing the write in that
// case is what would leave the two tools disagreeing.
test('a condition set on the map reaches the fight without touching hit points', () => {
  const combatants = [{ id: 0, hpCurrent: 7, hpMax: 7, isDead: false }];
  const next = fightWithTokenVitals(combatants, {
    sourceRef: 'enc_1:f1:0',
    hpCurrent: null,
    conditions: ['prone'],
    effects: [{ key: 'incomingAttackAdv', duration: 'next' }],
  });
  assert.deepEqual(next[0].activeConditions, ['prone']);
  assert.deepEqual(next[0].activeEffects, [{ key: 'incomingAttackAdv', duration: 'next' }]);
  assert.equal(next[0].hpCurrent, 7, 'health is left exactly as it was');
  assert.equal(next[0].isDead, false);
});
