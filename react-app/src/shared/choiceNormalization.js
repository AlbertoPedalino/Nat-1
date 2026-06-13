import { isFeatKey, isFeatDetailKey } from './featChoiceKeys.js';

const SKILL_NAMES = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
];

const COMMON_LANGUAGES = [
  'Common',
  'Draconic',
  'Dwarvish',
  'Elvish',
  'Giant',
  'Gnomish',
  'Goblin',
  'Halfling',
  'Orc',
  'Abyssal',
  'Celestial',
  'Deep Speech',
  'Infernal',
  'Primordial',
  'Sylvan',
  'Undercommon',
];

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

const VERSION_KEYS = new Set([
  'species_version',
]);

const SPELL_ABILITY_KEYS = new Set([
  'species_spell_ability',
]);

const SIZE_KEYS = new Set([
  'species_size',
]);

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap(asArray);
  if (value instanceof Set) return Array.from(value).flatMap(asArray);
  return [value];
}

function cleanText(value) {
  if (value == null) return '';
  if (typeof value === 'string') {
    return value
      .split('|')[0]
      .replace(/\{@\w+\s+/g, '')
      .replace(/\}/g, '')
      .trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') {
    const candidate = value.label ?? value.name ?? value.key ?? value.value ?? value.id;
    return cleanText(candidate);
  }
  return String(value).trim();
}

function compact(value) {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function uniquePush(target, value) {
  const text = cleanText(value);
  if (!text) return;
  const exists = target.some((item) => compact(item) === compact(text));
  if (!exists) target.push(text);
}

function uniquePushMany(target, values) {
  asArray(values).forEach((value) => uniquePush(target, value));
}

function normalizeChoiceValues(value) {
  return asArray(value)
    .map(cleanText)
    .filter(Boolean);
}

function makeLookup(values) {
  return new Set(values.map(compact).filter(Boolean));
}

const SKILL_LOOKUP = makeLookup(SKILL_NAMES);
const LANGUAGE_LOOKUP = makeLookup(COMMON_LANGUAGES);

function isAbility(value) {
  return ABILITY_KEYS.includes(compact(value));
}

function isSkill(value) {
  return SKILL_LOOKUP.has(compact(value));
}

function isLanguage(value) {
  return LANGUAGE_LOOKUP.has(compact(value));
}

function isToolLike(value) {
  const c = compact(value);
  if (!c) return false;
  return (
    c.includes('tool') ||
    c.includes('kit') ||
    c.includes('supplies') ||
    c.includes('instrument') ||
    c.includes('gaming') ||
    c.includes('vehicle') ||
    c.includes('utensils') ||
    c.includes('cards') ||
    c.includes('dice') ||
    c.includes('chess') ||
    c.includes('thievestools') ||
    c.includes('herbalism') ||
    c.includes('poisoner') ||
    c.includes('disguise') ||
    c.includes('forgery')
  );
}

function isWeaponMasteryKey(key) {
  const k = compact(key);
  return k.includes('weaponmastery') || (k.includes('weapon') && k.includes('mastery'));
}

function isExpertiseKey(key) {
  const raw = String(key || '').toLowerCase();
  // Match both spelled-out keys (rogue_expertise_lv1, bard_expertise) and the
  // abbreviated feat-granted form (..._feat_exp_..., ..._exp). Underscore
  // boundaries keep this from matching unrelated words like "export".
  if (raw.includes('expertise') || raw.includes('_exp_') || raw.endsWith('_exp')) return true;
  const k = compact(key);
  return k.includes('expertise') || k.includes('expert');
}

function isSkillKey(key) {
  const k = compact(key);
  return k.includes('skill') && !k.includes('spell');
}

function isToolKey(key) {
  const k = compact(key);
  return k.includes('tool') || k.includes('instrument') || k.includes('kit') || k.includes('gaming') || k.includes('vehicle');
}

function isLanguageKey(key) {
  const k = compact(key);
  return k.includes('language') || k.endsWith('lang') || k.includes('polyglot');
}

function isSpellChoiceKey(key) {
  const k = compact(key);
  return k.includes('spell') || k.includes('cantrip') || k.includes('arcanum');
}

function isSubclassKey(key) {
  return compact(key).startsWith('subclass');
}

function isBackgroundKey(key) {
  const k = compact(key);
  return k.startsWith('bg') || k === 'featorigin';
}

function classifyProficiencyValue(out, key, value, options = {}) {
  const text = cleanText(value);
  if (!text) return;

  const forceExpertise = Boolean(options.expertise);
  if (forceExpertise) {
    uniquePush(out.expertise, text);
    if (isSkill(text)) uniquePush(out.skills, text);
    else if (isToolLike(text)) uniquePush(out.tools, text);
    return;
  }

  if (isSkill(text)) {
    uniquePush(out.skills, text);
    return;
  }

  if (isLanguage(text)) {
    uniquePush(out.languages, text);
    return;
  }

  if (isToolLike(text)) {
    uniquePush(out.tools, text);
    return;
  }

  if (isSkillKey(key)) {
    uniquePush(out.skills, text);
    return;
  }

  if (isLanguageKey(key)) {
    uniquePush(out.languages, text);
    return;
  }

  if (isToolKey(key)) {
    uniquePush(out.tools, text);
  }
}

function normalizeChoiceEntry(out, key, value) {
  const values = normalizeChoiceValues(value);
  if (!values.length) return;

  out.rawByKey[key] = values.length === 1 ? values[0] : values;

  if (VERSION_KEYS.has(key)) {
    out.species.version = values[0] || null;
    out.species.options[key] = out.rawByKey[key];
    return;
  }

  if (SPELL_ABILITY_KEYS.has(key)) {
    const ability = values.find(isAbility) || values[0];
    out.species.spellAbility = compact(ability) || null;
    out.spells.spellAbilityChoices[key] = out.species.spellAbility;
    out.species.options[key] = out.species.spellAbility;
    return;
  }

  if (SIZE_KEYS.has(key)) {
    out.species.size = values[0] || null;
    out.species.options[key] = out.rawByKey[key];
    return;
  }

  if (isWeaponMasteryKey(key)) {
    uniquePushMany(out.weaponMasteries, values);
    out.choiceKeysByCategory.weaponMasteries.push(key);
    return;
  }

  if (isExpertiseKey(key)) {
    values.forEach((item) => classifyProficiencyValue(out, key, item, { expertise: true }));
    out.choiceKeysByCategory.expertise.push(key);
    return;
  }

  if (isSkillKey(key) || isToolKey(key) || isLanguageKey(key)) {
    values.forEach((item) => classifyProficiencyValue(out, key, item));
    if (isSkillKey(key)) out.choiceKeysByCategory.skills.push(key);
    if (isToolKey(key)) out.choiceKeysByCategory.tools.push(key);
    if (isLanguageKey(key)) out.choiceKeysByCategory.languages.push(key);
    if (isFeatKey(key)) return;
  }

  if (isSpellChoiceKey(key)) {
    out.spells.byKey[key] = out.rawByKey[key];
    if (compact(key).includes('cantrip')) uniquePushMany(out.spells.cantrips, values);
    else uniquePushMany(out.spells.spells, values);
    out.choiceKeysByCategory.spells.push(key);
    return;
  }

  if (isFeatDetailKey(key)) return;

  if (isFeatKey(key)) {
    out.feats.byKey[key] = out.rawByKey[key];
    uniquePushMany(out.feats.selected, values);
    if (key === 'feat_origin' || key === 'species_origin_feat') {
      uniquePushMany(out.feats.origin, values);
    }
    out.choiceKeysByCategory.feats.push(key);
    return;
  }

  if (key.startsWith('species_')) {
    out.species.options[key] = out.rawByKey[key];
    return;
  }

  if (isBackgroundKey(key)) {
    out.background.options[key] = out.rawByKey[key];
    return;
  }

  if (isSubclassKey(key)) {
    out.subclassOptions[key] = out.rawByKey[key];
    return;
  }

  out.classOptions[key] = out.rawByKey[key];
}

function emptyNormalizedChoices() {
  return {
    version: 1,
    skills: [],
    expertise: [],
    tools: [],
    languages: [],
    weaponMasteries: [],
    feats: {
      selected: [],
      origin: [],
      byKey: {},
    },
    spells: {
      cantrips: [],
      spells: [],
      byKey: {},
      spellAbilityChoices: {},
    },
    species: {
      version: null,
      size: null,
      spellAbility: null,
      options: {},
    },
    background: {
      options: {},
    },
    classOptions: {},
    subclassOptions: {},
    rawByKey: {},
    choiceKeysByCategory: {
      skills: [],
      expertise: [],
      tools: [],
      languages: [],
      weaponMasteries: [],
      feats: [],
      spells: [],
    },
  };
}

/**
 * Converts the builder's generic character.choices map into a stable structure
 * that the character sheet can consume without guessing only from key names.
 *
 * This function is intentionally non-destructive: character.choices remains the
 * canonical raw source, while normalizedChoices is a derived snapshot.
 */
export function normalizeCharacterChoices(character = {}) {
  const out = emptyNormalizedChoices();
  const choices = character?.choices && typeof character.choices === 'object'
    ? character.choices
    : {};

  Object.entries(choices).forEach(([key, value]) => {
    normalizeChoiceEntry(out, String(key), value);
  });

  const selectedSkills = character.selectedSkills;
  if (Array.isArray(selectedSkills)) {
    uniquePushMany(out.skills, selectedSkills);
  } else if (selectedSkills && typeof selectedSkills === 'object') {
    uniquePushMany(out.skills, selectedSkills.proficient);
    uniquePushMany(out.skills, selectedSkills.expert);
    uniquePushMany(out.skills, selectedSkills.expertise);
    uniquePushMany(out.expertise, selectedSkills.expert);
    uniquePushMany(out.expertise, selectedSkills.expertise);
  }
  uniquePushMany(out.languages, character.selectedLanguages);
  uniquePushMany(out.tools, character.selectedTools);
  uniquePushMany(out.spells.cantrips, character.selectedCantrips);
  uniquePushMany(out.spells.spells, character.selectedSpells);

  uniquePushMany(out.spells.spells, character.wizardSpellbook);
  uniquePushMany(out.spells.spells, character.wizardSpellMastery);
  uniquePushMany(out.spells.spells, character.wizardSignatureSpells);

  return out;
}

export function getNormalizedChoices(character = {}) {
  if (character?.normalizedChoices && typeof character.normalizedChoices === 'object') {
    return character.normalizedChoices;
  }
  return normalizeCharacterChoices(character);
}
