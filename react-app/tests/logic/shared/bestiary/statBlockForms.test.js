import test from 'node:test';
import assert from 'node:assert/strict';
import { isBestiaryStatBlock, isEncounterMonster } from '../../../../src/shared/bestiary/bestiary.js';
import { displayType } from '../../../../src/shared/bestiary/monsterUtils.js';
import { monsterStats } from '../../../../src/pages/compendium/catalogs/monsterCatalog.js';

// World of Warcraft's Wild Shape forms: stat blocks with rules for AC and Hit
// Points, a hidden type and no Challenge Rating.
const bearForm = {
  name: 'Bear Form',
  source: 'WoW',
  size: ['L'],
  type: { type: 'special', typeHidden: true },
  ac: [{ special: '15 + your Wisdom modifier' }],
  hp: { special: '3 times your Druid level', isTemporary: true },
  str: { special: 'Your Strength and Dexterity scores are equal to your Wisdom score.' },
};

test('a Wild Shape form is in the compendium but never an encounter monster', () => {
  assert.equal(isBestiaryStatBlock(bearForm), true);
  assert.equal(isEncounterMonster(bearForm), false);
  assert.equal(isEncounterMonster({ ...bearForm, name: 'Murloc', cr: '1/4' }), true);
});

test('a stat block without CR or with rule-based AC and HP shows dashes in the catalog', () => {
  const stats = monsterStats(bearForm);
  assert.equal(stats.cr, '—');
  assert.equal(stats.ac, '—');
  assert.equal(stats.hp, '—');
  assert.equal(monsterStats({ cr: '2', ac: [13], hp: { average: 22 } }).ac, 13);
});

test('a hidden creature type is not printed', () => {
  assert.equal(displayType(bearForm.type), '');
  assert.equal(displayType({ type: 'beast' }), 'beast');
});
