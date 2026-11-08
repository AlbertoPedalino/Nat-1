import test from 'node:test';
import assert from 'node:assert/strict';
import { heldProficiencyLabels } from '../../../../../src/shared/character/proficiency/heldProficiencies.js';

const character = {
  className: 'Rogue',
  level: 3,
  cls: { startingProficiencies: { tools: [{ "thieves' tools": true }], languages: ['Thieves\' Cant'] } },
  normalizedChoices: { skills: ['Stealth', 'tool:Lute'], tools: ['tool:Lute'], languages: ['Elvish'] },
  backgroundObj: { skillProficiencies: [{ insight: true, choose: { from: ['history'] } }] },
  speciesObj: { languageProficiencies: [{ common: true }] },
  allFeatures: [{ name: 'Expertise', level: 1, skillProficiencies: [{ acrobatics: true }] }],
  allFeatSnapshots: [{ name: 'Skilled', skillProficiencies: [{ perception: true }] }],
};

test('held proficiencies come from every source of their kind', () => {
  assert.deepEqual(heldProficiencyLabels(character, 'skill').sort(), ['Acrobatics', 'Insight', 'Perception', 'Stealth']);
  assert.ok(heldProficiencyLabels(character, 'tool').includes('Lute'));
  assert.equal(heldProficiencyLabels(character, 'tool').length, 2);
  assert.deepEqual(heldProficiencyLabels(character, 'language').sort(), ['Common', 'Elvish', "Thieves' Cant"]);
  assert.deepEqual(heldProficiencyLabels(character, 'armor'), []);
  assert.deepEqual(heldProficiencyLabels(null, 'skill'), []);
});
