import test from 'node:test';
import assert from 'node:assert/strict';
import { speciesWithVersion } from '../../../../src/shared/character/progression/speciesVersion.js';
import { genericSpeciesChoiceSpecs } from '../../../../src/shared/character/progression/choiceBlocks.js';

const tiefling = {
  name: 'Tiefling', darkvision: 60, resist: [{ choose: { from: ['poison', 'necrotic', 'fire'] } }],
  _versions: [
    { name: 'Tiefling; Abyssal Legacy', darkvision: 120, resist: ['poison'] },
    { name: 'Tiefling; Infernal Legacy', resist: ['fire'] },
  ],
};
const dragonborn = {
  name: 'Dragonborn', resist: [{ choose: { from: ['acid', 'fire'] } }],
  _versions: [{ _abstract: {}, _implementations: [
    { _variables: { color: 'Black', damageType: 'Acid' }, resist: ['acid'] },
    { _variables: { color: 'Red', damageType: 'Fire' }, resist: ['fire'] },
  ] }],
};
const elf = { name: 'Elf', speed: 30, _versions: [{ name: 'Elf; Wood Elf Lineage', speed: 35 }, { name: 'Elf; Drow Lineage', darkvision: 120 }] };

test("the chosen lineage's data replaces the base species'", () => {
  const abyssal = speciesWithVersion(tiefling, { species_version: ['Abyssal'] });
  assert.deepEqual([abyssal.darkvision, abyssal.resist], [120, ['poison']]);
  const infernal = speciesWithVersion(tiefling, { species_version: 'Infernal' });
  assert.deepEqual([infernal.darkvision, infernal.resist], [60, ['fire']]);
  assert.equal(speciesWithVersion(elf, { species_version: ['Wood Elf'] }).speed, 35);
  assert.equal(speciesWithVersion(elf, { species_version: ['Drow'] }).speed, 30);
  assert.equal(speciesWithVersion(elf, {}), elf, 'no choice: the species as is');
});

test("a colour picks its implementation, the old 'Black Dragon' value included", () => {
  assert.deepEqual(speciesWithVersion(dragonborn, { species_version: ['Red'] }).resist, ['fire']);
  assert.deepEqual(speciesWithVersion(dragonborn, { species_version: ['Black Dragon'] }).resist, ['acid']);
});

test('a species with versions offers no separate resistance pick', () => {
  assert.equal(genericSpeciesChoiceSpecs(tiefling).some((s) => s.key.startsWith('species_resist')), false);
  assert.equal(genericSpeciesChoiceSpecs({ resist: [{ choose: { from: ['fire'] } }] }).length, 1);
});
