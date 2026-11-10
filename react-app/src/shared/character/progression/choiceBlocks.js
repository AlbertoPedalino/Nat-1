import {
  ALL_TOOLS,
  ARTISAN_TOOLS,
  EXOTIC_LANGUAGES,
  GAMING_SETS,
  MUSICAL_INSTRUMENTS,
  SKILL_NAMES,
  STANDARD_LANGUAGES,
} from '../../content/rulesVocabulary.js';
import { stripMarkup } from '../../content/markupText.js';
import { capitalize } from '../../ui/textCase.js';
import { asArray } from '../../lists.js';

// 5etools proficiency "choose" blocks turned into builder choice specs — the
// one parser for species, backgrounds, feats and multiclassing.

export function specSan(value) {
  return stripMarkup(value)
    .split('|')[0]
    .trim();
}

export function specUniq(values) {
  return [...new Set((values || []).map(specSan).filter(Boolean))];
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

// The choices a species' own data offers: skills, tools, languages, a size
// and a resistance, each from its choose blocks. Every species gets these,
// with or without an adapter; adapters add only what the data cannot say.
export function genericSpeciesChoiceSpecs(species) {
  const specs = [];
  const add = (spec, type) => {
    if (!spec) return;
    specs.push({ ...spec, type: type || spec.type, from: spec.from.map(capitalize), level: 1 });
  };
  asArray(species?.skillProficiencies).forEach((block, index) => {
    add(choiceFromBlock(`species_skill_${index}`, 'Choose Skill', block, SKILL_NAMES), 'skill_choice');
  });
  asArray(species?.toolProficiencies).forEach((block, index) => {
    add(choiceFromBlock(`species_tool_${index}`, 'Choose Tool Proficiency', block, ALL_TOOLS));
  });
  asArray(species?.languageProficiencies || species?.languages).forEach((block, index) => {
    add(choiceFromBlock(`species_language_${index}`, 'Language', block, STANDARD_LANGUAGES), 'language_choice');
  });
  if (Array.isArray(species?.size) && species.size.length > 1) {
    const sizeMap = { M: 'Medium', S: 'Small' };
    specs.push({ key: 'species_size', label: 'Size', type: 'generic_choice', from: species.size.map((size) => sizeMap[size] || size), count: 1, level: 1 });
  }
  // The spellcasting ability of its spells, when the data lets the player
  // choose it (the base species' or any lineage's additionalSpells).
  const abilities = [species, ...asArray(species?._versions)]
    .flatMap((record) => asArray(record?.additionalSpells))
    .flatMap((grant) => asArray(grant?.ability?.choose));
  if (abilities.length) {
    specs.push({ key: 'species_spell_ability', label: 'Spellcasting Ability', type: 'ability_choice', from: [...new Set(abilities)], count: 1, level: 1 });
  }

  // A species with versions (Tiefling legacies, Dragonborn colours) takes its
  // resistance from the version chosen (speciesVersion.js): its base "choose"
  // only sums the versions up.
  if (!asArray(species?._versions).length) {
    asArray(species?.resist).forEach((block, index) => {
      add(choiceFromBlock(`species_resist_${index}`, 'Resistance', block, []));
    });
  }
  return specs;
}
