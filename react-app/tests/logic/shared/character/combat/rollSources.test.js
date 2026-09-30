import test from 'node:test';
import assert from 'node:assert/strict';
import { creatureRollSources } from '../../../../../src/shared/character/combat/rollSources.js';
import { d20RollKind } from '../../../../../src/pages/encounterbuilder/bestiary/statRolls.js';

// A creature's own d20 tests, from its conditions and its effects.

test('conditions and effects give a creature its attack sources; any of each cancel later', () => {
  assert.deepEqual(creatureRollSources({ conditions: ['poisoned'] }, 'attack'), { adv: false, disadv: true, autoFail: false });
  assert.deepEqual(creatureRollSources({ conditions: ['invisible'] }, 'attack'), { adv: true, disadv: false, autoFail: false });
  assert.deepEqual(
    creatureRollSources({ conditions: ['poisoned'], effects: [{ key: 'selfAttackAdv' }] }, 'attack'),
    { adv: true, disadv: true, autoFail: false },
  );
  // Frightened only while the source is in sight: a reminder, never the roll.
  assert.deepEqual(creatureRollSources({ conditions: ['frightened'] }, 'attack'), { adv: false, disadv: false, autoFail: false });
});

test('saves read DEX-only disadvantage and STR/DEX auto-fail; checks read check effects', () => {
  assert.equal(creatureRollSources({ conditions: ['restrained'] }, 'save', 'dex').disadv, true);
  assert.equal(creatureRollSources({ conditions: ['restrained'] }, 'save', 'wis').disadv, false);
  assert.equal(creatureRollSources({ conditions: ['stunned'] }, 'save', 'str').autoFail, true);
  assert.equal(creatureRollSources({ conditions: ['stunned'] }, 'save', 'wis').autoFail, false);
  assert.equal(creatureRollSources({ effects: [{ key: 'selfSaveAdv' }] }, 'save', 'wis').adv, true);
  assert.equal(creatureRollSources({ conditions: ['poisoned'] }, 'check').disadv, true);
  assert.equal(creatureRollSources({ effects: [{ key: 'selfCheckAdv' }] }, 'check').adv, true);
  assert.deepEqual(creatureRollSources({ conditions: null, effects: null }, 'attack'), { adv: false, disadv: false, autoFail: false });
});

test('stat block labels map to the kind of d20 test they are', () => {
  assert.deepEqual(d20RollKind('Attack Roll'), { kind: 'attack', ability: null });
  assert.deepEqual(d20RollKind('Dex Save'), { kind: 'save', ability: 'dex' });
  assert.deepEqual(d20RollKind('STR Check'), { kind: 'check', ability: null });
  assert.deepEqual(d20RollKind('Perception Check'), { kind: 'check', ability: null });
  assert.deepEqual(d20RollKind('D20 Roll'), { kind: null, ability: null });
  assert.equal(d20RollKind('Damage'), null);
  assert.equal(d20RollKind('HP'), null);
});
