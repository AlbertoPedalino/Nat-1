import test from 'node:test';
import assert from 'node:assert/strict';
import { filterMonsters, monsterFilterDefaults } from '../../../../src/shared/bestiary/filters.js';

const MONSTERS = [
  { name: 'Goblin Warrior', source: 'XMM', cr: '1/4', size: ['S'], type: 'fey' },
  { name: 'Ogre', source: 'XMM', cr: '2', size: ['L'], type: 'giant' },
  { name: 'Adult Red Dragon', source: 'XMM', cr: '17', size: ['H'], type: 'dragon' },
];
const names = (filters) => filterMonsters(MONSTERS, { ...monsterFilterDefaults(), ...filters }).map((m) => m.name);

test('the bestiary filters by a CR range, a type and a size', () => {
  assert.deepEqual(names({}), ['Goblin Warrior', 'Ogre', 'Adult Red Dragon']);
  assert.deepEqual(names({ crFrom: '1', crTo: '10' }), ['Ogre']);
  assert.deepEqual(names({ crTo: '2' }), ['Goblin Warrior', 'Ogre']);
  assert.deepEqual(names({ type: 'dragon' }), ['Adult Red Dragon']);
  assert.deepEqual(names({ size: 'L' }), ['Ogre']);
  assert.deepEqual(names({ search: 'ogr', sources: ['XMM'] }), ['Ogre']);
});

test('an unset filter is no choice', () => {
  assert.deepEqual(filterMonsters(MONSTERS, { search: '', type: '', sources: [] }).length, 3);
});
