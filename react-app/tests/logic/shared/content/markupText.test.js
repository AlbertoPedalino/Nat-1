import test from 'node:test';
import assert from 'node:assert/strict';
import { stripMarkup } from '../../../../src/shared/content/markupText.js';

test('markup keeps only the words it shows', () => {
  assert.equal(stripMarkup('{@item Shield|XPHB}'), 'Shield');
  assert.equal(stripMarkup('Proficiency in {@skill Stealth} and {@item Thieves\' Tools|XPHB}.'), 'Proficiency in Stealth and Thieves\' Tools.');
  assert.equal(stripMarkup('{@spell Fire Bolt|XPHB|fire bolt}'), 'fire bolt');
  assert.equal(stripMarkup('Shield|XPHB'), 'Shield|XPHB');
  assert.equal(stripMarkup(null), '');
});

test('2024 stat block labels and nested tags read as words', () => {
  assert.equal(stripMarkup('{@atkr m} {@hit 4}, reach 5 ft. {@h}5 ({@damage 1d6 + 2}) Slashing damage.'),
    'Melee Attack Roll: +4, reach 5 ft. Hit: 5 (1d6 + 2) Slashing damage.');
  assert.equal(stripMarkup('{@atkr m,r} {@hit 5}'), 'Melee or Ranged Attack Roll: +5');
  assert.equal(stripMarkup('{@actSave dex} {@dc 13}. {@actSaveFail} 7 Fire damage. {@actSaveSuccess} Half damage.'),
    'Dexterity Saving Throw: DC 13. Failure: 7 Fire damage. Success: Half damage.');
  assert.equal(stripMarkup('Visit {@tip {@link DnDBeyond.com|https://www.dndbeyond.com/}|A website}.'), 'Visit DnDBeyond.com.');
});
