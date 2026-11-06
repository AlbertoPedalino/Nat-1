import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bucketCounts, hasPickedSpell, isInWizardBook, withoutSpellPicked, withSpellPicked, withWizardBookToggled, wizardBookSize,
} from '../../../../../src/shared/character/spells/spellBuckets.js';

test('picking and unpicking spells by level returns only the changed field', () => {
  const bucket = { selectedCantrips: ['Light'], selectedSpells: { 1: ['Shield'] } };
  assert.deepEqual(withSpellPicked(bucket, 0, 'Mage Hand'), { selectedCantrips: ['Light', 'Mage Hand'] });
  assert.deepEqual(withSpellPicked(bucket, 2, 'Misty Step'), { selectedSpells: { 1: ['Shield'], 2: ['Misty Step'] } });
  assert.deepEqual(withSpellPicked(bucket, 1, 'shield'), {});
  assert.deepEqual(withoutSpellPicked(bucket, 1, 'Shield'), { selectedSpells: {} });
  assert.equal(hasPickedSpell(bucket, 1, 'SHIELD'), true);
  assert.deepEqual(bucketCounts(bucket), { cantrips: 1, spells: 1 });
  assert.deepEqual(bucket, { selectedCantrips: ['Light'], selectedSpells: { 1: ['Shield'] } });
});

test('taking a spell out of the spellbook also unprepares it', () => {
  const wizard = { wizardSpellbook: { 1: ['Shield', 'Sleep'] }, selectedSpells: { 1: ['Shield'] } };
  const removed = withWizardBookToggled(wizard, 1, 'Shield');
  assert.deepEqual(removed.wizardSpellbook[1], ['Sleep']);
  assert.deepEqual(removed.selectedSpells, {});
  const added = withWizardBookToggled(wizard, 2, 'Misty Step');
  assert.equal(isInWizardBook({ ...wizard, ...added }, 'misty step', 2), true);
  assert.equal(added.selectedSpells, undefined);
  assert.equal(wizardBookSize({ ...wizard, ...added }), 3);
});
