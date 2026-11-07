import test from 'node:test';
import assert from 'node:assert/strict';
import { spellPickerPool } from '../../../../../src/shared/character/spells/spellPickerPool.js';

const SPELLS = [
  { name: 'Fire Bolt', level: 0, school: 'V' },
  { name: 'Magic Missile', level: 1, school: 'V' },
  { name: 'Cure Wounds', level: 1, school: 'A' },
  { name: 'Fireball', level: 3, school: 'V' },
];
const INDEX = { wizard: ['fire bolt', 'magic missile', 'fireball'], cleric: ['cure wounds'] };
const names = (list) => list.map((spell) => spell.name);

test('offers the spells of the level on the class list', () => {
  assert.deepEqual(names(spellPickerPool({ spells: SPELLS, level: 1, classNames: ['Wizard'], classSpellIndex: INDEX })), ['Magic Missile']);
  assert.deepEqual(names(spellPickerPool({ spells: SPELLS, level: 1, classNames: null })), ['Magic Missile', 'Cure Wounds']);
});

test('caps leveled spells at maxLevel, never cantrips', () => {
  assert.deepEqual(spellPickerPool({ spells: SPELLS, level: 3, classNames: ['Wizard'], classSpellIndex: INDEX, maxLevel: 2 }), []);
  assert.deepEqual(names(spellPickerPool({ spells: SPELLS, level: 0, classNames: ['Wizard'], classSpellIndex: INDEX, maxLevel: 0 })), ['Fire Bolt']);
});

test('a preparing Wizard picks from the spellbook, unknown names by name', () => {
  const pool = spellPickerPool({ spells: SPELLS, level: 1, spellbookNames: ['magic missile', 'Lost Spell'] });
  assert.deepEqual(pool, [SPELLS[1], { name: 'Lost Spell', level: 1 }]);
});

test('granted spells come first, once per name, filtered by query and limit', () => {
  const granted = [{ name: 'Cure Wounds', level: 1, _autoGranted: true }, { name: 'Fireball', level: 3 }];
  const pool = spellPickerPool({ spells: SPELLS, level: 1, classNames: ['Wizard', 'Cleric'], classSpellIndex: INDEX, granted });
  assert.deepEqual(names(pool), ['Cure Wounds', 'Magic Missile']);
  assert.equal(pool[0]._autoGranted, true);
  assert.deepEqual(names(spellPickerPool({ spells: SPELLS, level: 1, classNames: null, query: 'cure' })), ['Cure Wounds']);
  assert.equal(spellPickerPool({ spells: SPELLS, level: 1, classNames: null, limit: 1 }).length, 1);
});
