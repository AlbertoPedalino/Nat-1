import test from 'node:test';
import assert from 'node:assert/strict';
import { hasOwnedFeat, ownedFeatNames } from '../../../../../src/shared/character/progression/selectedFeats.js';

test('a chosen feat counts even when no snapshot was saved for it', () => {
  // Alert has a snapshot; Tavern Brawler's record did not load at save time.
  const character = {
    choices: { feat_origin: 'Alert|XPHB', feat_asi_lv4: 'Tavern Brawler|XPHB' },
    allFeatSnapshots: [{ name: 'Alert' }],
  };
  assert.deepEqual(ownedFeatNames(character).sort(), ['Alert', 'Tavern Brawler']);
  assert.equal(hasOwnedFeat(character, 'Tavern Brawler'), true);
});

test('fighting styles, boons, species and background feats are all owned, once each', () => {
  const character = {
    choices: {
      mc1_fighter_fighting_style: 'Two-Weapon Fighting|XPHB',
      feat_epic_boon: 'Boon of Speed|XPHB',
      feat_asi_lv4_ability: 'str',
    },
    speciesSnapshot: { feats: [{ 'skilled|xphb': true }] },
    backgroundSnapshot: { feats: [{ 'magic initiate; cleric|xphb': true }] },
    allFeatSnapshots: [{ name: 'Boon of Speed' }],
  };
  const names = ownedFeatNames(character);
  assert.ok(names.includes('Two-Weapon Fighting'));
  assert.ok(names.includes('Boon of Speed'));
  assert.ok(names.includes('Skilled'));
  assert.equal(names.filter((name) => name === 'Boon of Speed').length, 1);
  assert.ok(!names.includes('str'), 'a feat detail choice is not a feat');
  assert.equal(hasOwnedFeat(character, 'two-weapon fighting'), true);
  assert.equal(hasOwnedFeat(character, 'Dual Wielder'), false);
});
