import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCharacterChoices } from '../../../../../src/shared/character/progression/choiceNormalization.js';
import { collectEquipmentProficiencySets } from '../../../../../src/shared/character/proficiency/equipmentSets.js';
import { collectAllProficiencies } from '../../../../../src/shared/character/proficiency/allProficiencies.js';

// What a character's builder choices grant, read in one place: the value says
// what it is (a skill, a language, a tool), the key only when the value alone
// does not (an instrument, a language outside the list, expertise, mastery).
const choices = {
  class_skill_0: ['Athletics'],
  bg_language_0: ['Elvish'],
  bg_tool_0: ["Smith's Tools"],
  monk_tool_proficiency: ['Lute'],
  species_language_bonus: ['Thalassian'],
  rogue_expertise_lv1: ['Stealth'],
  fighter_weapon_mastery: ['Longsword'],
  feat_asi_lv4_skill_tool: ['tool:Brewer\'s Supplies'],
  subclass_spell_list: ['Blood'],
  subclass_land_terrain: ['Arid'],
};

test('skills, expertise, tools, languages and masteries come from the choices', () => {
  const normalized = normalizeCharacterChoices({ choices });
  assert.deepEqual(normalized.skills.sort(), ['Athletics', 'Stealth']);
  assert.deepEqual(normalized.expertise, ['Stealth']);
  assert.deepEqual(normalized.languages.sort(), ['Elvish', 'Thalassian']);
  assert.deepEqual(normalized.tools.sort(), ["Brewer's Supplies", 'Lute', "Smith's Tools"]);
  assert.deepEqual(normalized.weaponMasteries, ['Longsword']);
});

test('the sheet reads tools, languages and masteries from that one reading', () => {
  const character = { choices, normalizedChoices: normalizeCharacterChoices({ choices }) };
  const sets = collectEquipmentProficiencySets(character);
  assert.ok(sets.weaponMasterySet.has('Longsword'));
  const section = (title) => collectAllProficiencies(character, sets).find((entry) => entry.title === title)?.items || [];
  const tools = section('Tools');
  const languages = section('Languages');
  assert.ok(["Smith's Tools", 'Lute', "Brewer's Supplies"].every((tool) => tools.includes(tool)), tools.join());
  assert.ok(['Elvish', 'Thalassian'].every((language) => languages.includes(language)), languages.join());
});

test('a species resistance pick is read by its key form, not by a word in the key', async () => {
  const { collectResolvedResistanceItems } = await import('../../../../../src/shared/character/sheet/sheetDefenses.js');
  const labels = (picks) => collectResolvedResistanceItems({ choices: picks }).map((item) => item.label);
  assert.deepEqual(labels({ species_resist_0: ['Fire'] }), ['Fire']);
  assert.deepEqual(labels({ species_resistance_note: ['Fire'] }), []);
});
