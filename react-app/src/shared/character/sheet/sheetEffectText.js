import {
  canonicalDisplayLabel,
  cleanProficiencyText,
} from '../progression/proficiencyDisplay.js';
import { readChoiceValue } from '../progression/choiceUtils.js';
import { asArray } from '../../lists.js';
import { matchKey, stripSource } from '../../content/nameKeys.js';
import { DAMAGE_TYPES } from '../../content/rulesVocabulary.js';

// How a sheet effect reads: its text cleaned for display and comparison,
// the value its stored choice resolves to, and its title and one-line summary.

export function cleanText(value) {
  if (value == null) return '';
  if (typeof value === 'object') {
    return cleanText(value.name ?? value.label ?? value.value ?? value.key ?? value.id);
  }
  return cleanProficiencyText(value);
}

// An effect's text (cleaned like a proficiency) as a comparison key.
export function effectKey(value) {
  return matchKey(cleanText(value));
}

export function displayLabel(value) {
  return canonicalDisplayLabel(value);
}

function firstChoiceText(character, key) {
  const value = readChoiceValue(character, key);
  const first = asArray(value).find((item) => item != null && item !== '');
  return stripSource(cleanText(first));
}

function parentheticalDamageType(text) {
  const match = cleanText(text).match(/\(([^)]+)\)/);
  if (!match) return '';
  const inside = match[1];
  return DAMAGE_TYPES.find((type) => effectKey(type) === effectKey(inside)) || '';
}

export function inferDamageTypeFromText(text) {
  const cleaned = cleanText(text);
  const inParen = parentheticalDamageType(cleaned);
  if (inParen) return inParen;

  const compact = effectKey(cleaned);
  const direct = DAMAGE_TYPES.find((type) => compact.includes(effectKey(type)));
  if (direct) return direct;

  return '';
}

function normalizeChoiceToken(value) {
  return matchKey(cleanText(value)
    .split('|')[0]
    .split('(')[0]
    .replace(/\bdragon\b/gi, ''));
}

function lookupMapValue(map, choice) {
  if (!map || typeof map !== 'object' || !choice) return '';
  const token = normalizeChoiceToken(choice);
  if (!token) return '';
  const direct = Object.entries(map).find(([k]) => normalizeChoiceToken(k) === token);
  if (direct) return direct[1];
  const partial = Object.entries(map).find(([k]) => {
    const nk = normalizeChoiceToken(k);
    return nk && (token.includes(nk) || nk.includes(token));
  });
  return partial ? partial[1] : '';
}

export function resolveChoiceValue(effect, character) {
  let choice = firstChoiceText(character, effect?.key);
  if (!choice && effect?.ownerType === 'feat' && effect?.choiceKeySuffix) {
    const featSlot = Object.entries(character?.choices || {}).find(([, value]) => (
      asArray(value).some((entry) => effectKey(entry) === effectKey(effect.ownerName))
    ))?.[0];
    if (featSlot) choice = firstChoiceText(character, `${featSlot}_${effect.choiceKeySuffix}`);
  }
  if (!choice) return '';

  const map = effect?.map || effect?.valueMap;
  if (map) {
    const mapped = lookupMapValue(map, choice);
    if (mapped) return mapped;
  }

  const fromChoice = inferDamageTypeFromText(choice);
  if (fromChoice) return fromChoice;

  if (effect?.damageTypes) return asArray(effect.damageTypes).map(displayLabel).join(', ');
  return displayLabel(choice);
}

export function effectTitle(effect) {
  const type = cleanText(effect?.type);
  const normalizedType = effectKey(type);

  const labels = {
    resistance: 'Resistance',
    'resistance-choice': 'Resistance',
    immunity: 'Immunity',
    'immunity-choice': 'Immunity',
    conditionImmunity: 'Condition Immunity',
    sense: 'Sense',
    darkvision: 'Darkvision',
    telepathy: 'Telepathy',
    speed: 'Speed',
    acFormula: 'Armor Class Formula',
    unarmoredDefense: 'Unarmored Defense',
    hpBonus: 'HP Bonus',
    armorTraining: 'Armor Training',
    weaponTraining: 'Weapon Training',
    toolProficiency: 'Tool Proficiency',
    skillProficiency: 'Skill Proficiency',
    expertise: 'Expertise',
    extraAttack: 'Extra Attack',
    critRange: 'Critical Range',
    advantage: 'Advantage',
  };

  // One speed shape for every mode (effectBonuses.js getSpeedEffects).
  if (type === 'speed' && effect?.speedType && effectKey(effect.speedType) !== 'walk') {
    return `${displayLabel(effect.speedType)} Speed`;
  }
  if (labels[type]) return labels[type];
  if (normalizedType.includes('resistance')) return 'Resistance';
  if (normalizedType.includes('immunity')) return 'Immunity';
  if (normalizedType.includes('sense')) return 'Sense';
  if (normalizedType.includes('speed')) return 'Speed';

  const note = cleanText(effect?.note);
  if (note) return note;

  return type || 'Effect';
}

export function effectSummary(effect, character = {}) {
  const parts = [];
  const type = effectKey(effect?.type);

  if (type.includes('resistancechoice') || type.includes('immunitychoice')) {
    const resolved = resolveChoiceValue(effect, character);
    if (resolved) parts.push(resolved);
    else parts.push('Choose');
  } else if (effect?.damageTypes) {
    parts.push(asArray(effect.damageTypes).map(displayLabel).join(', '));
  }

  if (effect?.conditions) parts.push(asArray(effect.conditions).map(displayLabel).join(', '));
  if (effect?.values) parts.push(asArray(effect.values).map(displayLabel).join(', '));
  if (effect?.value != null) parts.push(displayLabel(effect.value));
  if (effect?.ability) parts.push(cleanText(effect.ability).toUpperCase());
  if (effect?.skill) parts.push(displayLabel(effect.skill));
  if (effect?.target) parts.push(displayLabel(effect.target));
  if (effect?.key && !String(effect.key).startsWith('subclass_')) parts.push(cleanText(effect.key));

  const note = cleanText(effect?.note);
  if (note && !parts.some((part) => effectKey(note).includes(effectKey(part)))) parts.push(note);

  return parts.filter(Boolean).join(' • ');
}
