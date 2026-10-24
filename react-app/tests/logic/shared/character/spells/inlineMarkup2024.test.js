import test from 'node:test';
import assert from 'node:assert/strict';
import { strip5eMarkup } from '../../../../../src/shared/character/spells/spellEntries.js';

test('2024 stat block labels and nested tags read as words', () => {
  assert.equal(strip5eMarkup('{@atkr m} {@hit 4}, reach 5 ft. {@h}5 ({@damage 1d6 + 2}) Slashing damage.'),
    'Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage.');
  assert.equal(strip5eMarkup('{@atkr m,r} {@hit 5}'), 'Melee or Ranged Attack Roll: +5');
  assert.equal(strip5eMarkup('{@actSave dex} {@dc 13}. {@actSaveFail} 7 Fire damage. {@actSaveSuccess} Half damage.'),
    'Dexterity Saving Throw: DC 13. Failure: 7 Fire damage. Success: Half damage.');
  assert.equal(strip5eMarkup('Visit {@tip {@link DnDBeyond.com|https://www.dndbeyond.com/}|A website}.'), 'Visit DnDBeyond.com.');
});
