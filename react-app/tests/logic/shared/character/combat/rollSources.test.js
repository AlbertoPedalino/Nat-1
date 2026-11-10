import test from 'node:test';
import assert from 'node:assert/strict';
import { creatureRollSources } from '../../../../../src/shared/character/combat/rollSources.js';
import { advTag, d20RollKind, situationalNote } from '../../../../../src/shared/bestiary/statRolls.js';

// A creature's own d20 tests, from its conditions.

test('conditions give a creature its attack sources', () => {
  assert.deepEqual(creatureRollSources({ conditions: ['poisoned'] }, 'attack'), { adv: false, disadv: true, autoFail: false, situational: [] });
  assert.deepEqual(creatureRollSources({ conditions: ['invisible'] }, 'attack'), { adv: true, disadv: false, autoFail: false, situational: [] });
  // Both at once stay unfolded: the caller cancels them, or adds a one-off source.
  assert.deepEqual(
    creatureRollSources({ conditions: ['poisoned', 'invisible'] }, 'attack'),
    { adv: true, disadv: true, autoFail: false, situational: [] },
  );
  // Frightened only while the source is in sight: a reminder, never the roll.
  const frightened = creatureRollSources({ conditions: ['frightened'] }, 'attack');
  assert.deepEqual([frightened.adv, frightened.disadv], [false, false]);
  assert.deepEqual(frightened.situational.map((c) => c.source), ['Frightened']);
  assert.equal(creatureRollSources({ conditions: ['grappled'] }, 'attack').situational[0].source, 'Grappled');
  assert.equal(creatureRollSources({ conditions: ['frightened'] }, 'check').situational[0].source, 'Frightened');
  assert.deepEqual(creatureRollSources({ conditions: ['frightened'] }, 'save', 'wis').situational, []);
});

test('saves read DEX-only disadvantage and STR/DEX auto-fail; checks read check conditions', () => {
  assert.equal(creatureRollSources({ conditions: ['restrained'] }, 'save', 'dex').disadv, true);
  assert.equal(creatureRollSources({ conditions: ['restrained'] }, 'save', 'wis').disadv, false);
  assert.equal(creatureRollSources({ conditions: ['stunned'] }, 'save', 'str').autoFail, true);
  assert.equal(creatureRollSources({ conditions: ['stunned'] }, 'save', 'wis').autoFail, false);
  assert.equal(creatureRollSources({ conditions: ['poisoned'] }, 'check').disadv, true);
  assert.deepEqual(creatureRollSources({ conditions: null }, 'attack'), { adv: false, disadv: false, autoFail: false, situational: [] });
  // A reminder changes no roll.
  assert.deepEqual(
    creatureRollSources({ conditions: [], effects: [{ key: 'custom', text: 'Guidance' }] }, 'check'),
    { adv: false, disadv: false, autoFail: false, situational: [] },
  );
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

test('a stat block roller says DIS? when only a situational disadvantage may apply', () => {
  const situational = [{ source: 'Frightened', note: 'while the source of fear is in sight' }];
  assert.equal(advTag(undefined, situational), ' DIS?');
  assert.equal(advTag(false, situational), ' DIS', 'a forced disadvantage says so plainly');
  assert.equal(advTag(undefined, []), '');
  assert.equal(situationalNote(situational), 'Situational disadvantage: Frightened (while the source of fear is in sight)');
});
