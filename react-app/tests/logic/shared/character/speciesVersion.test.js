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

test("a species' spells come from its data, the chosen lineage's included", async () => {
  const { enumerateSpeciesGrants } = await import('../../../../src/shared/character/spells/autoGrantedSpells.js');
  const gnome = {
    name: 'Gnome',
    _versions: [{ name: 'Gnome; Forest Gnome Lineage', additionalSpells: [{
      ability: { choose: ['int', 'wis', 'cha'] },
      known: { 1: ['minor illusion|xphb#c'] },
      innate: { 1: { daily: { pb: ['speak with animals|xphb'] } } },
    }] }],
  };
  const grants = enumerateSpeciesGrants({
    speciesName: 'Gnome', speciesSource: 'XPHB', level: 3, speciesObj: gnome,
    choices: { species_version: ['Forest Gnome'], species_spell_ability: ['wis'] },
    normalizedChoices: { species: { spellAbility: 'wis' } },
  });
  assert.deepEqual(grants.map((g) => [g.name, g.explicitSource, g.ability]), [
    ['minor illusion', 'Forest Gnome Lineage', 'wis'],
    ['speak with animals', 'Forest Gnome Lineage', 'wis'],
  ]);
  // Proficiency Bonus uses per Long Rest, as the data says.
  assert.equal(grants[1].entry.freeCast.usesFormula, 'proficiencyBonus');
});

test("the species spellcasting ability pick comes from its data", () => {
  const specs = genericSpeciesChoiceSpecs({ _versions: [{ name: 'X; Y', additionalSpells: [{ ability: { choose: ['int', 'cha'] } }] }] });
  assert.deepEqual(specs.find((s) => s.key === 'species_spell_ability').from, ['int', 'cha']);
});
