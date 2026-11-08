import {
  extractFixedProficiencyLabels, isChoicePlaceholderValue, parseTypedProficiencyValue,
} from '../progression/typedProficiencies.js';
import { characterClassFeatures } from '../progression/classLevel.js';

// Where each kind of proficiency comes from: the picks the builder keeps in
// `normalizedChoices`, and the ones granted outright by the class's starting
// proficiencies, the background, the species, class and subclass features,
// and feats.
const KINDS = Object.freeze({
  skill: { choices: 'skills', start: [], field: 'skillProficiencies' },
  tool: { choices: 'tools', start: ['tools', 'toolProficiencies'], field: 'toolProficiencies' },
  language: { choices: 'languages', start: ['languages', 'languageProficiencies'], field: 'languageProficiencies' },
  weapon: { choices: 'weapons', start: ['weapons', 'weaponProficiencies'], field: 'weaponProficiencies' },
});

// The proficiencies of one kind ('skill', 'tool', 'language', 'weapon') a
// character already holds, as labels (duplicates possible). What a choice
// cannot offer again, and what the preview lists.
export function heldProficiencyLabels(character, kind) {
  const spec = KINDS[kind];
  if (!spec || !character) return [];
  const labels = [];
  for (const value of character.normalizedChoices?.[spec.choices] || []) {
    const parsed = parseTypedProficiencyValue(value);
    if ((parsed.kind && parsed.kind !== kind) || !parsed.label || isChoicePlaceholderValue(parsed.label)) continue;
    labels.push(parsed.label);
  }
  const start = (character.cls || character.clsSnapshot)?.startingProficiencies;
  for (const key of spec.start) labels.push(...extractFixedProficiencyLabels(start?.[key]));
  const granted = (entity) => labels.push(...extractFixedProficiencyLabels(entity?.[spec.field]));
  granted(character.backgroundObj || character.backgroundSnapshot);
  granted(character.speciesObj || character.speciesSnapshot);
  characterClassFeatures(character).forEach(granted);
  (character.allFeatSnapshots || []).forEach(granted);
  return labels;
}
