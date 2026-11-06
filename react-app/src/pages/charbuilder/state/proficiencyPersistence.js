import {
  splitTypedProficiencies,
  uniqueProficiencyLabels,
} from '../../../shared/character/progression/typedProficiencies.js';
import { asArray } from '../../../shared/lists.js';

// Typed proficiency choices (skill/tool/language picks stored under choice
// keys) folded into the character's selected lists before it is saved.

export function collectTypedProficiencyChoices(choices = {}) {
  const all = Object.values(choices || {}).flatMap(asArray);
  const split = splitTypedProficiencies(all);
  return {
    skills: uniqueProficiencyLabels(split.skill),
    tools: uniqueProficiencyLabels(split.tool),
    languages: uniqueProficiencyLabels(split.language),
  };
}

export function mergeSelectedSkills(selectedSkills, addedSkills) {
  const additions = uniqueProficiencyLabels(addedSkills);
  if (!additions.length) return selectedSkills || [];

  if (selectedSkills && !Array.isArray(selectedSkills) && typeof selectedSkills === 'object') {
    return {
      ...selectedSkills,
      proficient: uniqueProficiencyLabels([...(selectedSkills.proficient || []), ...additions]),
    };
  }

  return uniqueProficiencyLabels([...(Array.isArray(selectedSkills) ? selectedSkills : []), ...additions]);
}

export function mergeSelectedList(current, additions) {
  const added = uniqueProficiencyLabels(additions);
  if (!added.length) return Array.isArray(current) ? current : [];
  return uniqueProficiencyLabels([...(Array.isArray(current) ? current : []), ...added]);
}

export function mergeNormalizedChoices(normalizedChoices, typedProfs) {
  const hasTyped = typedProfs.skills.length || typedProfs.tools.length || typedProfs.languages.length;
  if (!normalizedChoices && !hasTyped) return null;

  const normalized = normalizedChoices && typeof normalizedChoices === 'object'
    ? { ...normalizedChoices }
    : {};

  normalized.skills = uniqueProficiencyLabels([...(normalized.skills || []), ...typedProfs.skills]);
  normalized.tools = uniqueProficiencyLabels([...(normalized.tools || []), ...typedProfs.tools]);
  normalized.languages = uniqueProficiencyLabels([...(normalized.languages || []), ...typedProfs.languages]);

  return normalized;
}

export function normalizeProficiencyChoicesForPersistence(character = {}) {
  const typedProfs = collectTypedProficiencyChoices(character.choices || {});

  return {
    ...character,
    selectedSkills: mergeSelectedSkills(character.selectedSkills, typedProfs.skills),
    selectedTools: mergeSelectedList(character.selectedTools, typedProfs.tools),
    selectedLanguages: mergeSelectedList(character.selectedLanguages, typedProfs.languages),
    normalizedChoices: mergeNormalizedChoices(character.normalizedChoices, typedProfs),
  };
}
