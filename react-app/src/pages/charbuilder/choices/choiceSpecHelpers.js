import {
  ALL_TOOLS,
  ARTISAN_TOOLS,
  EXOTIC_LANGUAGES,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  SKILL_NAMES,
  STANDARD_LANGUAGES,
} from '../../../shared/content/rulesVocabulary.js';
import { choiceFromBlock, specUniq } from '../../../shared/character/progression/choiceBlocks.js';

// Building blocks of the builder's choice specs: proficiency choose-blocks
// turned into specs, label cleanup and de-duplication.

export function mixedSkillToolOptions() {
  return [
    ...SKILL_NAMES.map((skill) => ({
      value: `skill:${skill}`,
      label: skill,
      group: 'Skills',
      kind: 'skill',
    })),
    ...ALL_TOOLS.map((tool) => ({
      value: `tool:${tool}`,
      label: tool,
      group: 'Tools',
      kind: 'tool',
    })),
  ];
}

export function specPush(out, spec) {
  const from = specUniq(spec.from || []);
  if (!from.length && !spec.options?.length) return;
  out.push({ ...spec, from });
}

export function choiceSpecsFromProficiencyBlocks({ blocks, slotKey, keySuffix, label, type, fallbackFrom = [] }) {
  return (blocks || []).flatMap((block, index) => {
    const spec = choiceFromBlock(`${slotKey}_${keySuffix}_${index}`, label, block, fallbackFrom);
    return spec ? [{ ...spec, type }] : [];
  });
}
