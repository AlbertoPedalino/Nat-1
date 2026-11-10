import test from 'node:test';
import assert from 'node:assert/strict';
import { speciesChoiceSpecs } from '../../../../src/pages/charbuilder/choices/choiceSpecs.js';
import { genericSpeciesChoiceSpecs } from '../../../../src/shared/character/progression/choiceBlocks.js';

// One parser for what a species' data offers, whether or not it has an adapter.
const species = {
  name: 'Testfolk',
  source: 'XPHB',
  size: ['M', 'S'],
  skillProficiencies: [{ choose: { from: ['perception', 'stealth'], count: 1 } }],
  toolProficiencies: [{ anyArtisansTool: 1 }],
  resist: [{ choose: { from: ['fire', 'cold'] } }],
};

test('a species with no adapter still offers its tool, size and resistance picks', () => {
  const specs = speciesChoiceSpecs({ speciesName: 'Testfolk', speciesSource: 'XPHB', speciesObj: species, choices: {} });
  const byKey = Object.fromEntries(specs.map((spec) => [spec.key, spec]));
  assert.deepEqual(byKey.species_skill_0.from, ['Perception', 'Stealth']);
  assert.equal(byKey.species_skill_0.type, 'skill_choice');
  assert.ok(byKey.species_tool_0.from.length > 5, 'any artisan tool');
  assert.deepEqual(byKey.species_size.from, ['Medium', 'Small']);
  assert.deepEqual(byKey.species_resist_0.from, ['Fire', 'Cold']);
});

test('a species without choose blocks offers nothing of its own', () => {
  assert.deepEqual(genericSpeciesChoiceSpecs({ size: ['M'], skillProficiencies: [{ insight: true }] }), []);
});

// Spell picks come from the data's additionalSpells "choose" items: per
// lineage (gated on species_version) or for the whole species.
const elf = {
  name: 'Elf',
  source: 'WoW',
  additionalSpells: [{ name: 'High Elf', known: { 1: { _: [{ choose: 'level=0|class=Wizard' }] } } }],
  _versions: [
    { name: 'Elf; High Elf Lineage', additionalSpells: [{ known: { 1: { _: [{ choose: 'level=0|class=Wizard' }] } } }] },
    { name: 'Elf; Blood Elf Lineage', additionalSpells: [{ known: { 1: { _: [{ choose: 'level=0|class=Wizard' }] } } }] },
    { name: 'Elf; Night Elf Lineage', additionalSpells: [{ known: { 1: ['dancing lights|xphb#c'] } }] },
  ],
};

test('each lineage that lets the player pick a cantrip gets its own gated pick', () => {
  const specs = genericSpeciesChoiceSpecs(elf).filter((spec) => spec.type === 'spell_choice');
  assert.deepEqual(specs.map((spec) => spec.key), ['species_high_elf_cantrip', 'species_blood_elf_cantrip']);
  assert.deepEqual(specs[0].requiredChoice, { key: 'species_version', value: 'High Elf' });
  assert.deepEqual(specs[0].spellFilter.spellLevels, [0]);
  assert.deepEqual(specs[0].classes, ['Wizard']);
  assert.equal(specs[0].label, 'Wizard Cantrip (High Elf)');
});

test('the builder shows a lineage cantrip pick only for the chosen lineage', () => {
  const character = (version) => ({ speciesName: 'Elf', speciesSource: 'WoW', speciesObj: elf, choices: { species_version: version } });
  const keys = (version) => speciesChoiceSpecs(character(version)).map((spec) => spec.key);
  assert.ok(keys('Blood Elf').includes('species_blood_elf_cantrip'));
  assert.ok(!keys('Blood Elf').includes('species_high_elf_cantrip'));
  assert.ok(!keys('Night Elf').some((key) => key.endsWith('_cantrip')));
});

test('a species-wide cantrip pick needs no lineage', () => {
  const khoravar = { name: 'Khoravar', source: 'EFA', additionalSpells: [{ known: { 1: { _: [{ choose: 'level=0|class=Cleric;Druid;Wizard' }] } } }] };
  const [spec] = genericSpeciesChoiceSpecs(khoravar).filter((s) => s.type === 'spell_choice');
  assert.equal(spec.key, 'species_cantrip_0');
  assert.deepEqual(spec.classes, ['Cleric', 'Druid', 'Wizard']);
  assert.equal(spec.requiredChoice, undefined);
});
