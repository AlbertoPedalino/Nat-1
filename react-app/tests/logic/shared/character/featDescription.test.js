import test from 'node:test';
import assert from 'node:assert/strict';
import { featDescriptionEntries } from '../../../../src/shared/character/progression/featDescription.js';
import { entriesToTextBlocks } from '../../../../src/shared/character/spells/spellEntries.js';

const textOf = (feat) => entriesToTextBlocks(featDescriptionEntries(feat)).map((block) => block.text).join('\n');
const allAbilities = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

test('fixed ability increases appear before the feat benefits without changing the source', () => {
  const feat = { name: 'Great Weapon Master', ability: [{ str: 1 }], entries: ['Heavy Weapon Mastery benefits.'] };
  const original = structuredClone(feat);
  assert.equal(textOf(feat), 'Ability Score Increase. Increase your Strength score by 1, to a maximum of 20.\nHeavy Weapon Mastery benefits.');
  assert.deepEqual(feat, original);
  assert.equal(textOf({ ability: [{ con: 1 }] }), 'Ability Score Increase. Increase your Constitution score by 1, to a maximum of 20.');
});

test('choice increases name the allowed abilities and amount', () => {
  assert.equal(textOf({ ability: [{ choose: { from: ['str', 'dex'] } }] }),
    'Ability Score Increase. Increase your Strength or Dexterity score by 1, to a maximum of 20.');
  assert.match(textOf({ ability: [{ choose: { from: ['int', 'wis', 'cha'], amount: 2 } }] }),
    /Increase your Intelligence, Wisdom, or Charisma score by 2/);
});

test('epic increases retain the explicit maximum and allow any ability', () => {
  assert.equal(textOf({ ability: [{ max: 30, choose: { from: allAbilities } }] }),
    'Ability Score Increase. Increase one ability score of your choice by 1, to a maximum of 30.');
});

test('alternative increases stay alternatives rather than cumulative bonuses', () => {
  const entries = featDescriptionEntries({ ability: [
    { choose: { from: allAbilities, amount: 2 } },
    { choose: { from: allAbilities, count: 2 } },
  ] });
  assert.equal(entries[0], '{@b Ability Score Increase.} Choose one of the following:');
  assert.deepEqual(entries[1], { type: 'list', items: [
    'Increase one ability score of your choice by 2, to a maximum of 20.',
    'Increase 2 different ability scores of your choice by 1 each, to a maximum of 20.',
  ] });
});

test('weighted choices describe distinct ability scores and their respective amounts', () => {
  assert.match(textOf({ ability: [{ choose: { weighted: { from: allAbilities, weights: [2, 1] } } }] }),
    /Increase 2 different ability scores of your choice by 2 and 1 respectively, to a maximum of 20/);
});

test('feats without structured increases retain their descriptions', () => {
  const entries = ['A benefit without any ability increase.'];
  assert.equal(featDescriptionEntries({ name: 'Great Weapon Master', source: 'PHB', entries }), entries);
  assert.deepEqual(featDescriptionEntries(undefined), []);
});

test('existing ability increase descriptions are not duplicated, including repeated rendering', () => {
  const ability = [{ str: 1 }];
  for (const entries of [
    ['Increase your Strength score by 1, to a maximum of 20.'],
    [{ type: 'entries', name: 'Ability Score Increase', entries: ['Your Strength increases by 1.'] }],
    featDescriptionEntries({ ability }),
  ]) {
    assert.equal(featDescriptionEntries({ ability, entries }), entries);
  }
});
