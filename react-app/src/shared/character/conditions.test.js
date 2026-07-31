import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSIGNABLE_CONDITIONS,
  CONDITIONS,
  CONDITION_EFFECTS,
  EXHAUSTION_KEY,
  conditionLabel,
  describeAttackRoll,
  describeCheckDisadvantage,
  getConditionalConditionEffects,
  getConditionsWithEffect,
  getSpeedZeroConditions,
  hasConditionEffect,
  normalizeConditions,
  toggleCondition,
} from './conditions.js';

test('every CONDITION_EFFECTS row matches a condition in the CONDITIONS table', () => {
  const keys = new Set(CONDITIONS.map((c) => c.key));
  for (const key of Object.keys(CONDITION_EFFECTS)) {
    assert.ok(keys.has(key), `${key} has effects but is not a listed condition`);
  }
});

test('condition effect lookups split always-on from situational', () => {
  // Poisoned always imposes attack disadvantage; Frightened only while the fear
  // source is in sight, so it is a reminder and never drives the roll.
  assert.equal(hasConditionEffect(['poisoned'], 'yourAttacksDisadv'), true);
  assert.equal(hasConditionEffect(['frightened'], 'yourAttacksDisadv'), false);
  assert.deepEqual(getConditionsWithEffect(['poisoned', 'frightened'], 'yourAttacksDisadv'), ['Poisoned']);
  assert.deepEqual(getConditionalConditionEffects(['frightened'], 'yourAttacksDisadv'), [
    { source: 'Frightened', note: 'while the source of fear is in sight' },
  ]);
  assert.deepEqual(getSpeedZeroConditions(['prone', 'restrained']), ['Restrained']);
});

test('attack roll: a plain roll carries no tag, no tint and no adv argument', () => {
  const roll = describeAttackRoll([]);
  assert.deepEqual(roll, { adv: false, disadv: false, advArg: undefined, tag: '', tooltip: '' });
});

test('attack roll: condition disadvantage tags and tints the roll', () => {
  const roll = describeAttackRoll(['poisoned']);
  assert.equal(roll.disadv, true);
  assert.equal(roll.advArg, false);
  assert.equal(roll.tag, ' DIS');
});

test('attack roll: a non-condition disadvantage (heavy/untrained weapon) counts', () => {
  const roll = describeAttackRoll([], { extraDisadv: true });
  assert.equal(roll.disadv, true);
  assert.equal(roll.tag, ' DIS');
});

test('attack roll: a non-condition advantage source is named in the tooltip', () => {
  const roll = describeAttackRoll(['invisible'], { extraAdv: 'Innate Sorcery' });
  assert.equal(roll.adv, true);
  assert.equal(roll.advArg, true);
  assert.equal(roll.tag, ' ADV');
  assert.equal(roll.tooltip, 'Advantage: Innate Sorcery');
});

test('attack roll: advantage and disadvantage cancel to a straight roll (XPHB 2024)', () => {
  const roll = describeAttackRoll(['invisible', 'poisoned']);
  assert.equal(roll.adv, false);
  assert.equal(roll.disadv, false);
  assert.equal(roll.advArg, undefined);
  assert.equal(roll.tag, '');
});

test('attack roll: cancelling also applies across condition and non-condition sources', () => {
  const roll = describeAttackRoll(['invisible'], { extraDisadv: true });
  assert.equal(roll.advArg, undefined);
  assert.equal(roll.tag, '');
});

test('attack roll: situational disadvantage warns without changing the roll', () => {
  const roll = describeAttackRoll(['frightened']);
  assert.equal(roll.disadv, false);
  assert.equal(roll.advArg, undefined);
  assert.equal(roll.tag, ' DIS?');
  assert.equal(roll.tooltip, 'Situational disadvantage: Frightened (while the source of fear is in sight)');
});

test('attack roll: a real advantage hides the situational-disadvantage tag but keeps its note', () => {
  const roll = describeAttackRoll(['frightened', 'invisible'], { extraAdv: 'Innate Sorcery' });
  assert.equal(roll.tag, ' ADV');
  assert.equal(
    roll.tooltip,
    'Advantage: Innate Sorcery • Situational disadvantage: Frightened (while the source of fear is in sight)',
  );
});

test('check disadvantage: armor and conditions are reported as one reason list', () => {
  assert.deepEqual(describeCheckDisadvantage([], false), { has: false, reason: '', conditional: [] });

  const armorOnly = describeCheckDisadvantage([], true);
  assert.equal(armorOnly.has, true);
  assert.equal(armorOnly.reason, 'armor');

  const both = describeCheckDisadvantage(['poisoned'], true);
  assert.equal(both.reason, 'armor, Poisoned');

  // Frightened is situational: it never sets `has`, only the reminder list.
  const situational = describeCheckDisadvantage(['frightened'], false);
  assert.equal(situational.has, false);
  assert.deepEqual(situational.conditional, [
    { source: 'Frightened', note: 'while the source of fear is in sight' },
  ]);
});

test('adding a condition also applies the ones it inherently imposes', () => {
  assert.deepEqual(toggleCondition([], 'unconscious').sort(), ['incapacitated', 'prone', 'unconscious']);
  assert.deepEqual(toggleCondition([], 'stunned').sort(), ['incapacitated', 'stunned']);
  assert.deepEqual(toggleCondition([], 'prone'), ['prone']);
});

test('an implied condition already present is not duplicated', () => {
  const next = toggleCondition(['prone'], 'unconscious');
  assert.equal(next.filter((k) => k === 'prone').length, 1);
});

// Removal is deliberately not cascaded: an implied condition can stand on its
// own, so dropping it would silently undo a separate call the GM made.
test('removing a condition leaves the ones it implied in place', () => {
  const applied = toggleCondition([], 'unconscious');
  const removed = toggleCondition(applied, 'unconscious');
  assert.deepEqual(removed.sort(), ['incapacitated', 'prone']);
});

test('toggling never mutates the list it was given', () => {
  const before = ['prone'];
  toggleCondition(before, 'unconscious');
  assert.deepEqual(before, ['prone']);
});

test('normalizeConditions drops unknown keys, duplicates and junk input', () => {
  assert.deepEqual(normalizeConditions(['prone', 'prone']), ['prone']);
  assert.deepEqual(normalizeConditions(['prone', 'not-a-condition']), ['prone']);
  assert.deepEqual(normalizeConditions(null), []);
  assert.deepEqual(normalizeConditions('prone'), []);
  assert.deepEqual(normalizeConditions([null, undefined, 42]), []);
});

// The sync layer builds echo-suppression keys from this, so two lists holding
// the same conditions must normalize identically whatever the click order.
test('normalizeConditions is order-independent', () => {
  assert.deepEqual(normalizeConditions(['prone', 'blinded']), normalizeConditions(['blinded', 'prone']));
});

test('exhaustion is listed but never offered as an assignable toggle', () => {
  assert.ok(CONDITIONS.some((c) => c.key === EXHAUSTION_KEY));
  assert.equal(ASSIGNABLE_CONDITIONS.some((c) => c.key === EXHAUSTION_KEY), false);
  assert.equal(ASSIGNABLE_CONDITIONS.length, CONDITIONS.length - 1);
  // It still survives normalization: a sheet's exhaustion must round-trip
  // through a combat that cannot set it.
  assert.deepEqual(normalizeConditions([EXHAUSTION_KEY]), [EXHAUSTION_KEY]);
});

test('conditionLabel falls back to the raw key', () => {
  assert.equal(conditionLabel('prone'), 'Prone');
  assert.equal(conditionLabel('mystery'), 'mystery');
});
