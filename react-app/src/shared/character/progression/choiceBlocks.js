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
import {
  additionalSpellChoiceGroups,
  choiceGroupSpellFilter,
  choiceGroupWhat,
} from '../spells/additionalSpellChoices.js';
import { versionChoiceLabel } from './speciesVersion.js';

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

  const versionSpec = speciesVersionChoiceSpec(species);
  if (versionSpec) specs.push(versionSpec);
  specs.push(...speciesSpellChoiceSpecs(species));

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

function lineageKeyPart(label) {
  return String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function spellChoiceSpec(group, key, lineage) {
  const what = choiceGroupWhat(group);
  const classes = group.classes.join('/');
  return {
    key,
    label: `${[classes, what].filter(Boolean).join(' ')}${lineage ? ` (${lineage})` : ''}`,
    type: 'spell_choice',
    count: group.count,
    level: group.minLevel,
    spellFilter: choiceGroupSpellFilter(group),
    classes: group.classes,
    ...(lineage ? { requiredChoice: { key: 'species_version', value: lineage } } : {}),
  };
}

// The spells a species or one of its lineages lets the player pick (High Elf:
// a Wizard cantrip; Khoravar: a Cleric, Druid or Wizard cantrip), from its
// additionalSpells "choose" items. A lineage pick is keyed
// `species_<lineage>_cantrip` / `_spell` and counts only while that lineage is
// chosen; a species-wide pick is `species_cantrip_<n>` / `species_spell_<n>`.
// With versions, the base species' additionalSpells only sum them up.
export function speciesSpellChoiceSpecs(species) {
  const versions = asArray(species?._versions).filter((version) => !version?._abstract);
  if (versions.length) {
    return versions.flatMap((version) => {
      const lineage = versionChoiceLabel(version);
      const grants = asArray(version?.additionalSpells);
      if (!lineage || grants.length !== 1) return [];
      const part = lineageKeyPart(lineage);
      return additionalSpellChoiceGroups(grants[0]).map((group, index) => {
        const kind = group.level === 0 ? 'cantrip' : 'spell';
        return spellChoiceSpec(group, `species_${part}_${kind}${index ? `_${index}` : ''}`, lineage);
      });
    });
  }
  const grants = asArray(species?.additionalSpells);
  if (grants.length !== 1) return [];
  return additionalSpellChoiceGroups(grants[0]).map((group, index) => (
    spellChoiceSpec(group, `species_${group.level === 0 ? 'cantrip' : 'spell'}_${index}`, null)
  ));
}

// The lineage / legacy pick of a species with versions ("Elf; Drow Lineage",
// "Tiefling; Abyssal Legacy", "Shifter; Beasthide"), stored as its short name.
// Named after the species trait that offers it ("Elven Lineage"). Abstract
// variants (Dragonborn colours) are an adapter's to offer.
export function speciesVersionChoiceSpec(species) {
  const versions = asArray(species?._versions).filter((version) => !version?._abstract);
  const labels = [...new Set(versions.map(versionChoiceLabel).filter(Boolean))];
  if (!labels.length) return null;
  const trait = asArray(species?.entries)
    .map((entry) => (entry && typeof entry === 'object' ? String(entry.name || '') : ''))
    .find((name) => /(Lineage|Legacy)$/i.test(name));
  return {
    key: 'species_version',
    label: trait || `${species?.name || 'Species'} Lineage`,
    type: 'option',
    options: labels.map((label) => ({ key: label, label })),
    count: 1,
    level: 1,
  };
}
