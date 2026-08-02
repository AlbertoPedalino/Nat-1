import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fightRefMatches,
  fightWithTokenVitals,
  makeSourceRef,
  parseSourceRef,
  tokenUpdatesFromFight,
} from './encounterSync.js';

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

test('a fight pushes its hit points onto the pieces that came from it', () => {
  const tokens = [
    { id: 't1', sourceRef: 'enc_1:f1:0', hpCurrent: 7, hpMax: 7 },
    { id: 't2', sourceRef: 'enc_1:f1:1', hpCurrent: 5, hpMax: 5 },
  ];
  const updates = tokenUpdatesFromFight(tokens, {
    instanceId: 'enc_1',
    fightId: 'f1',
    combatants: [{ id: 0, hpCurrent: 3, hpMax: 7 }, { id: 1, hpCurrent: 5, hpMax: 5 }],
  });
  // Only the one that actually changed: a no-op update is a wasted write and a
  // realtime event for nothing.
  assert.deepEqual(updates, [{ id: 't1', hpCurrent: 3, hpMax: 7, conditions: [], effects: [] }]);
});

// Marking a creature prone in one tool and finding it upright in the other is
// the drift that makes two views of a fight worse than one view.
test('conditions and effects travel with the hit points', () => {
  const tokens = [{ id: 't1', sourceRef: 'enc_1:f1:0', hpCurrent: 7, hpMax: 7, conditions: [], effects: [] }];
  const updates = tokenUpdatesFromFight(tokens, {
    instanceId: 'enc_1',
    fightId: 'f1',
    combatants: [{
      id: 0,
      hpCurrent: 7,
      hpMax: 7,
      activeConditions: ['prone'],
      activeEffects: [{ key: 'selfAttackDisadv', duration: 'next' }],
    }],
  });
  assert.equal(updates.length, 1, 'a condition alone is reason enough to update');
  assert.deepEqual(updates[0].conditions, ['prone']);
  assert.deepEqual(updates[0].effects, [{ key: 'selfAttackDisadv', duration: 'next' }]);
});

// Order is normalized on both sides, so a list that says the same thing in a
// different order is not a change worth writing.
test('a reordered list is not treated as a change', () => {
  const tokens = [{
    id: 't1',
    sourceRef: 'enc_1:f1:0',
    hpCurrent: 7,
    hpMax: 7,
    conditions: ['prone', 'blinded'],
    effects: [],
  }];
  const updates = tokenUpdatesFromFight(tokens, {
    instanceId: 'enc_1',
    fightId: 'f1',
    combatants: [{ id: 0, hpCurrent: 7, hpMax: 7, activeConditions: ['blinded', 'prone'] }],
  });
  assert.deepEqual(updates, []);
});

// A character's piece is placed from the party roster, not imported from a
// fight, so it has no source reference. Matching it by the sheet it stands for
// is what lets a condition set in the encounter reach the map at all.
test('a character piece is matched to its combatant by the sheet it stands for', () => {
  const tokens = [{ id: 't1', characterId: 'char-1', conditions: [], effects: [] }];
  const updates = tokenUpdatesFromFight(tokens, {
    instanceId: 'enc_1',
    fightId: 'f1',
    combatants: [{ id: 0, sourceId: 'char-1', hpCurrent: 4, hpMax: 22, activeConditions: ['prone'] }],
  });
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].conditions, ['prone']);
  // Hit points are the sheet's, and the encounter builder already syncs those
  // directly: copying them onto the piece would put a second version in play.
  assert.equal('hpCurrent' in updates[0], false);
});

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

test('pieces from another fight, or from none, are left alone', () => {
  const tokens = [
    { id: 't1', sourceRef: 'enc_1:other:0', hpCurrent: 7, hpMax: 7 },
    { id: 't2', sourceRef: 'other_enc:f1:0', hpCurrent: 7, hpMax: 7 },
    { id: 't3', sourceRef: null, characterId: null, hpCurrent: 7, hpMax: 7 },
  ];
  const updates = tokenUpdatesFromFight(tokens, {
    instanceId: 'enc_1',
    fightId: 'f1',
    combatants: [{ id: 0, hpCurrent: 1, hpMax: 7 }],
  });
  assert.deepEqual(updates, []);
  assert.equal(fightRefMatches(tokens[0], 'enc_1', 'f1'), false);
  assert.equal(fightRefMatches({ sourceRef: 'enc_1:f1:0' }, 'enc_1', 'f1'), true);
});

test('a combatant that no longer exists does not produce an update', () => {
  const updates = tokenUpdatesFromFight(
    [{ id: 't1', sourceRef: 'enc_1:f1:9', hpCurrent: 7, hpMax: 7 }],
    { instanceId: 'enc_1', fightId: 'f1', combatants: [{ id: 0, hpCurrent: 1, hpMax: 7 }] },
  );
  assert.deepEqual(updates, []);
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
