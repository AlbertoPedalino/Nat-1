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
