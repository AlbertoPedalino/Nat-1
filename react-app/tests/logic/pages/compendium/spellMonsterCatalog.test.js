import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompendiumIndex } from '../../../../src/pages/compendium/compendiumIndex.js';
import { castingTimeKind, filterSpells, spellClasses } from '../../../../src/pages/compendium/spellCatalog.js';
import { filterMonsters } from '../../../../src/pages/compendium/monsterCatalog.js';

test('spells filter by level, school, class, casting time, concentration and ritual', () => {
  const classSpellIndex = { wizard: new Set(['fireball', 'detect magic']), cleric: new Set(['detect magic', 'healing word']) };
  const index = buildCompendiumIndex({
    spell: [
      { name: 'Fireball', source: 'XPHB', level: 3, schoolFull: 'Evocation', time: [{ number: 1, unit: 'action' }] },
      { name: 'Detect Magic', source: 'XPHB', level: 1, schoolFull: 'Divination', ritual: true, concentration: true, time: [{ number: 1, unit: 'action' }] },
      { name: 'Healing Word', source: 'XPHB', level: 1, schoolFull: 'Abjuration', time: [{ number: 1, unit: 'bonus' }] },
      { name: 'Wish', source: 'XPHB', level: 9, schoolFull: 'Conjuration', time: [{ number: 1, unit: 'action' }] },
    ],
  });
  index.forEach((entry) => { entry.classes = spellClasses(entry.record, classSpellIndex); });
  const names = (filters) => filterSpells(index, filters).map((entry) => entry.name);
  assert.deepEqual(names({}), ['Detect Magic', 'Healing Word', 'Fireball', 'Wish'], 'by level, then name');
  assert.deepEqual(names({ class: 'cleric' }), ['Detect Magic', 'Healing Word']);
  assert.deepEqual(names({ level: '3' }), ['Fireball']);
  assert.deepEqual(names({ school: 'Divination' }), ['Detect Magic']);
  assert.deepEqual(names({ time: 'bonus' }), ['Healing Word']);
  assert.deepEqual(names({ ritual: 'yes' }), ['Detect Magic']);
  assert.deepEqual(names({ concentration: 'no', class: 'wizard' }), ['Fireball']);
  assert.deepEqual(names({ sort: 'name' }), ['Detect Magic', 'Fireball', 'Healing Word', 'Wish']);
  assert.equal(castingTimeKind({ time: [{ number: 10, unit: 'minute' }] }), 'longer');
});

test('monsters filter by challenge rating range, type and size', () => {
  const index = buildCompendiumIndex({
    monster: [
      { name: 'Goblin Warrior', source: 'XMM', cr: '1/4', type: { type: 'fey', tags: ['goblinoid'] }, size: ['S'] },
      { name: 'Young Red Dragon', source: 'XMM', cr: '10', type: 'dragon', size: ['L'] },
      { name: 'Adult Red Dragon', source: 'XMM', cr: { cr: '17', lair: '18' }, type: 'dragon', size: ['H'] },
      { name: 'Pseudodragon', source: 'XMM', cr: '1/4', type: 'dragon', size: ['T'] },
    ],
  });
  const names = (filters) => filterMonsters(index, filters).map((entry) => entry.name);
  assert.deepEqual(names({ type: 'dragon', sort: 'cr' }), ['Pseudodragon', 'Young Red Dragon', 'Adult Red Dragon']);
  assert.deepEqual(names({ crFrom: '1', crTo: '15' }), ['Young Red Dragon']);
  assert.deepEqual(names({ crTo: '1/2' }), ['Goblin Warrior', 'Pseudodragon']);
  assert.deepEqual(names({ size: 'H' }), ['Adult Red Dragon']);
  assert.deepEqual(names({ type: 'fey' }), ['Goblin Warrior']);
});
