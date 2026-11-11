import { isFeatKey, isFeatDetailKey } from './featChoiceKeys.js';
import { flattenList } from '../../lists.js';
import { isChoicePlaceholderValue, parseTypedProficiencyValue } from './typedProficiencies.js';
import { choiceKey, choiceText } from '../../content/nameKeys.js';
import { ABILITIES, ALL_LANGUAGES, SKILL_NAMES } from '../../content/rulesVocabulary.js';

const VERSION_KEYS = new Set([
  'species_version',
]);

const SPELL_ABILITY_KEYS = new Set([
  'species_spell_ability',
]);

const SIZE_KEYS = new Set([
  'species_size',
]);

function uniquePush(target, value) {
  const text = choiceText(value);
  if (!text) return;
  const exists = target.some((item) => choiceKey(item) === choiceKey(text));
  if (!exists) target.push(text);
}

function uniquePushMany(target, values) {
  flattenList(values).forEach((value) => uniquePush(target, value));
}

function normalizeChoiceValues(value) {
  return flattenList(value)
    .map(choiceText)
    .filter(Boolean);
}

function makeLookup(values) {
  return new Set(values.map(choiceKey).filter(Boolean));
}

const SKILL_LOOKUP = makeLookup(SKILL_NAMES);
const LANGUAGE_LOOKUP = makeLookup(ALL_LANGUAGES);

function isAbility(value) {
  return ABILITIES.includes(choiceKey(value));
}

function isSkill(value) {
  return SKILL_LOOKUP.has(choiceKey(value));
}

function isLanguage(value) {
  return LANGUAGE_LOOKUP.has(choiceKey(value));
}

function isToolLike(value) {
  const c = choiceKey(value);
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
  const k = choiceKey(key);
  return k.includes('weaponmastery') || (k.includes('weapon') && k.includes('mastery'));
}

// Plain weapon-proficiency choices (not mastery, which is handled above first).
function isWeaponProficiencyKey(key) {
  const k = choiceKey(key);
  return k.includes('weapon') && !k.includes('mastery');
}

function isExpertiseKey(key) {
  const raw = String(key || '').toLowerCase();
  // Match both spelled-out keys (rogue_expertise_lv1, bard_expertise) and the
  // abbreviated feat-granted form (..._feat_exp_..., ..._exp). Underscore
  // boundaries keep this from matching unrelated words like "export".
  if (raw.includes('expertise') || raw.includes('_exp_') || raw.endsWith('_exp')) return true;
  const k = choiceKey(key);
  return k.includes('expertise') || k.includes('expert');
}

function isSkillKey(key) {
  const k = choiceKey(key);
  return k.includes('skill') && !k.includes('spell');
}

function isToolKey(key) {
  const k = choiceKey(key);
  return k.includes('tool') || k.includes('instrument') || k.includes('kit') || k.includes('gaming') || k.includes('vehicle');
}

function isLanguageKey(key) {
  const k = choiceKey(key);
  return k.includes('language') || k.endsWith('lang') || k.includes('polyglot');
}

// What a choice grants, read off its key: the one place a builder choice key
// is read for its kind, for the saved choices here and the builder's specs
// (ChoiceBlock). Only what the value alone cannot say: a weapon's mastery or
// its proficiency, expertise, and the fallback for a value outside the known
// lists (an instrument, a setting's language). Null for any other choice.
export function choiceKeyKind(key) {
  if (isWeaponMasteryKey(key)) return 'weaponMastery';
  if (isWeaponProficiencyKey(key)) return 'weapon';
  if (isExpertiseKey(key)) return 'expertise';
  if (isSkillKey(key)) return 'skill';
  if (isLanguageKey(key)) return 'language';
  if (isToolKey(key)) return 'tool';
  return null;
}

// What a picked value names: a skill, a language or a tool, else null.
function valueKind(text) {
  if (isSkill(text)) return 'skill';
  if (isLanguage(text)) return 'language';
  if (isToolLike(text)) return 'tool';
  return null;
}

// One picked value: its typed kind ("tool:Brewer's Supplies"), else what it
// names, else what its key says.
function classifyProficiencyValue(out, key, value, { expertise = false } = {}) {
  const typed = parseTypedProficiencyValue(value);
  const text = typed.label;
  if (!text || isChoicePlaceholderValue(text)) return;
  const keyKind = choiceKeyKind(key);
  const kind = typed.kind || valueKind(text) || (keyKind === 'expertise' ? null : keyKind);
  if (expertise) {
    uniquePush(out.expertise, text);
    if (kind === 'skill') uniquePush(out.skills, text);
    else if (kind === 'tool') uniquePush(out.tools, text);
    return;
  }
  if (kind === 'skill') uniquePush(out.skills, text);
  else if (kind === 'language') uniquePush(out.languages, text);
  else if (kind === 'tool') uniquePush(out.tools, text);
  else if (kind === 'weapon') uniquePush(out.weapons, text);
}

function normalizeChoiceEntry(out, key, value) {
  const values = normalizeChoiceValues(value);
  if (!values.length) return;

  out.rawByKey[key] = values.length === 1 ? values[0] : values;

  if (VERSION_KEYS.has(key)) {
    out.species.version = values[0] || null;
    return;
  }

  if (SPELL_ABILITY_KEYS.has(key)) {
    const ability = values.find(isAbility) || values[0];
    out.species.spellAbility = choiceKey(ability) || null;
    return;
  }

  if (SIZE_KEYS.has(key)) {
    out.species.size = values[0] || null;
    return;
  }

  const kind = choiceKeyKind(key);
  if (kind === 'weaponMastery') {
    uniquePushMany(out.weaponMasteries, values);
    return;
  }
  if (kind === 'weapon') {
    uniquePushMany(out.weapons, values);
    return;
  }
  if (kind === 'expertise') {
    values.forEach((item) => classifyProficiencyValue(out, key, item, { expertise: true }));
    return;
  }
  if (kind) {
    values.forEach((item) => classifyProficiencyValue(out, key, item));
    if (isFeatKey(key)) return;
  } else {
    // A typed value says what it is under any key.
    values.filter((item) => parseTypedProficiencyValue(item).kind).forEach((item) => classifyProficiencyValue(out, key, item));
  }

  if (isFeatDetailKey(key)) return;

  if (isFeatKey(key)) {
    out.feats.byKey[key] = out.rawByKey[key];
    uniquePushMany(out.feats.selected, values);
    if (key === 'feat_origin' || key === 'species_origin_feat') {
      uniquePushMany(out.feats.origin, values);
    }
  }
}

function emptyNormalizedChoices() {
  return {
    version: 1,
    skills: [],
    expertise: [],
    tools: [],
    languages: [],
    weapons: [],
    weaponMasteries: [],
    feats: {
      selected: [],
      origin: [],
      byKey: {},
    },
    species: {
      version: null,
      size: null,
      spellAbility: null,
    },
    rawByKey: {},
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

  return out;
}

export function getNormalizedChoices(character = {}) {
  if (character?.normalizedChoices && typeof character.normalizedChoices === 'object') {
    return character.normalizedChoices;
  }
  return normalizeCharacterChoices(character);
}
