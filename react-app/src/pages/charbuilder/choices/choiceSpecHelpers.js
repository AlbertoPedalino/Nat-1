import {
  ALL_TOOLS,
  ARTISAN_TOOLS,
  EXOTIC_LANGUAGES,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  SKILL_NAMES,
  STANDARD_LANGUAGES,
} from '../../../shared/content/rulesVocabulary.js';
import { stripMarkup } from '../../../shared/content/markupText.js';

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

export function specSan(value) {
  return stripMarkup(value)
    .split('|')[0]
    .trim();
}

export function specUniq(values) {
  return [...new Set((values || []).map(specSan).filter(Boolean))];
}

export function specPush(out, spec) {
  const from = specUniq(spec.from || []);
  if (!from.length && !spec.options?.length) return;
  out.push({ ...spec, from });
}

export function choiceFromBlock(prefix, label, block, fallbackFrom = []) {
  if (!block || typeof block !== 'object') return null;
  const choose = block.choose;
  const hasChoiceIndicator = choose || block.any || block.anyTool || block.anyArtisansTool
    || block.anyMusicalInstrument || block.anyGamingSet || block.anyStandard || block.anyExotic;
  if (!hasChoiceIndicator) return null;
  let from = choose?.from || choose?.weighted?.from || null;
  let count = Number(choose?.count || choose?.weighted?.weights?.length || 0);
  if (!from?.length) {
    if (block.anyArtisansTool) from = ARTISAN_TOOLS;
    else if (block.anyMusicalInstrument) from = MUSICAL_INSTRUMENTS;
    else if (block.anyGamingSet) from = GAMING_SETS;
    else if (block.anyStandard) from = STANDARD_LANGUAGES;
    else if (block.anyExotic) from = EXOTIC_LANGUAGES;
    else if (block.anyTool || block.any) from = fallbackFrom;
  }
  if (!count) {
    count = Number(
      block.anyTool
      || block.anyArtisansTool
      || block.anyMusicalInstrument
      || block.anyGamingSet
      || block.anyStandard
      || block.anyExotic
      || block.any
      || 1,
    );
  }
  if (typeof from === 'string') {
    const token = from.trim();
    from = token && !/^(any|classSkillList)$/i.test(token) ? [token] : fallbackFrom;
  }
  from = specUniq(from?.length ? from : fallbackFrom);
  if (!from?.length) return null;
  return { key: prefix, label, type: 'generic_choice', from, count };
}

export function choiceSpecsFromProficiencyBlocks({ blocks, slotKey, keySuffix, label, type, fallbackFrom = [] }) {
  return (blocks || []).flatMap((block, index) => {
    const spec = choiceFromBlock(`${slotKey}_${keySuffix}_${index}`, label, block, fallbackFrom);
    return spec ? [{ ...spec, type }] : [];
  });
}
