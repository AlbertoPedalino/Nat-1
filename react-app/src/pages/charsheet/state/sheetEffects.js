import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import {
  canonicalDisplayLabel,
  cleanProficiencyText,
} from '../../../shared/character/progression/proficiencyDisplay.js';
import { matchesRequiredChoice } from '../../../shared/character/progression/lineageMatch.js';
import { inventoryHasFlag } from '../../../shared/character/progression/choiceUtils.js';
import { ownedFeatNames } from '../../../shared/character/progression/selectedFeats.js';
import { primaryClassLevel } from '../../../shared/character/progression/classLevel.js';
import { asArray } from '../../../shared/lists.js';
import { matchKey } from '../../../shared/content/nameKeys.js';

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

const DAMAGE_TYPES = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
];

export function displayLabel(value) {
  return canonicalDisplayLabel(value);
}

function ownerLevelOf(character, className, isPrimary) {
  if (isPrimary) return primaryClassLevel(character);
  const found = (character?.extraClasses || []).find((entry) => effectKey(entry?.name) === effectKey(className));
  return Number(found?.level || 1);
}

function conditionPasses(effect, context) {
  if (typeof effect?.condition !== 'function') return true;
  try {
    return !!effect.condition(context.character, context);
  } catch (_) {
    try {
      return !!effect.condition(context);
    } catch {
      return false;
    }
  }
}

function requiredChoicePasses(effect, character) {
  const rc = effect?.requiredChoice;
  if (!rc?.key) return true;
  return matchesRequiredChoice(character, rc);
}

function requiredItemFlagPasses(effect, character) {
  const requirement = effect?.requiredItemFlag;
  if (!requirement) return true;
  const inv = character?.inventory || [];
  return inventoryHasFlag(inv, requirement);
}

function effectIsActive(effect, context) {
  if (!effect || typeof effect !== 'object') return false;
  const minLevel = Number(effect.minLevel || 1);
  if (Number(context.ownerLevel || 1) < minLevel) return false;
  if (!requiredChoicePasses(effect, context.character)) return false;
  if (!requiredItemFlagPasses(effect, context.character)) return false;
  return conditionPasses(effect, context);
}

function annotate(effect, meta) {
  return {
    ...effect,
    ownerName: meta.ownerName,
    ownerType: meta.ownerType,
    ownerLevel: meta.ownerLevel,
    sourceKey: meta.sourceKey,
  };
}

function dedupeEffects(effects) {
  const byKey = new Map();

  effects.forEach((effect) => {
    const key = [
      effectKey(effect.type),
      effectKey(effect.key || effect.note || effect.senseType || effect.speedType || effect.ability || effect.target || ''),
      effectKey(asArray(effect.damageTypes).join(',')),
      effectKey(asArray(effect.conditions).join(',')),
      effectKey(effect.ownerName),
      String(effect.minLevel || ''),
    ].join('|');

    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, effect);
      return;
    }

    const existingScore = String(existing.note || '').length + (existing.ownerType === 'runtime' ? 0 : 20);
    const nextScore = String(effect.note || '').length + (effect.ownerType === 'runtime' ? 0 : 20);
    if (nextScore > existingScore) byKey.set(key, effect);
  });

  return [...byKey.values()];
}

function collectFromList(out, list, meta, character) {
  const context = { character, ownerLevel: meta.ownerLevel, ownerName: meta.ownerName, ownerType: meta.ownerType };
  asArray(list).forEach((effect) => {
    if (!effectIsActive(effect, context)) return;
    out.push(annotate(effect, meta));
  });
}

function choiceValue(character, key) {
  if (!key) return null;

  const direct = character?.choices?.[key];
  if (direct != null) return direct;

  const normalized = character?.normalizedChoices || {};
  const byKey = normalized.rawByKey || {};
  if (byKey[key] != null) return byKey[key];

  const buckets = [
    normalized.classOptions,
    normalized.subclassOptions,
    normalized.species?.options,
    normalized.background?.options,
    normalized.feats?.byKey,
    normalized.spells?.byKey,
  ];

  for (const bucket of buckets) {
    if (bucket && bucket[key] != null) return bucket[key];
  }

  const found = Object.entries(character?.choices || {}).find(([choiceKey]) => (
    String(choiceKey || '').replace(/^mc\d+_/, '') === key
  ));
  return found ? found[1] : null;
}

function firstChoiceText(character, key) {
  const value = choiceValue(character, key);
  const first = asArray(value).find((item) => item != null && item !== '');
  return cleanText(first).split('|')[0];
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
  return cleanText(value)
    .split('|')[0]
    .split('(')[0]
    .replace(/\bdragon\b/gi, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
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

export function collectSheetEffects(character = {}) {
  const out = [];

  const entities = [
    {
      className: character.className,
      subclassShortName: character.subclassShortName,
      ownerName: character.className,
      ownerLevel: ownerLevelOf(character, character.className, true),
      isPrimary: true,
    },
    ...(character.extraClasses || []).map((entry) => ({
      className: entry.name,
      subclassShortName: entry.subclassShortName,
      ownerName: entry.name,
      ownerLevel: Number(entry.level || 1),
      isPrimary: false,
    })),
  ].filter((entry) => entry.className);

  entities.forEach((entity) => {
    collectFromList(out, installedRegistry.getClassSheetEffects(entity.className), {
      ownerName: entity.className,
      ownerType: 'class',
      ownerLevel: entity.ownerLevel,
      sourceKey: entity.className,
    }, character);

    if (entity.subclassShortName) {
      collectFromList(out, installedRegistry.getSubclassSheetEffects(entity.className, entity.subclassShortName), {
        ownerName: entity.subclassShortName,
        ownerType: 'subclass',
        ownerLevel: entity.ownerLevel,
        sourceKey: `${entity.className}_${entity.subclassShortName}`,
      }, character);
    }
  });

  if (character.speciesName) {
    collectFromList(out, installedRegistry.getSpeciesSheetEffects(character.speciesName, character.speciesSource), {
      ownerName: character.speciesName,
      ownerType: 'species',
      ownerLevel: Number(character.level || 1),
      sourceKey: `${character.speciesName}_${character.speciesSource || ''}`,
    }, character);
  }

  ownedFeatNames(character).forEach((feat) => {
    collectFromList(out, installedRegistry.getFeatSheetEffects(feat), {
      ownerName: feat,
      ownerType: 'feat',
      ownerLevel: Number(character.level || 1),
      sourceKey: feat,
    }, character);
  });

  return dedupeEffects(out);
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
    flySpeed: 'Fly Speed',
    climbSpeed: 'Climb Speed',
    swimSpeed: 'Swim Speed',
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

export function effectCategory(effect) {
  const type = effectKey(effect?.type);

  if (
    type.includes('resistance')
    || type.includes('immunity')
    || type.includes('defense')
    || type.includes('ward')
    || type.includes('damagereduction')
    || type.includes('unarmored')
    || type.includes('acformula')
    || type.includes('acbonus')
    || type.includes('hprelated')
    || type.includes('hpbonus')
  ) return 'Defenses';

  if (
    type.includes('sense')
    || type.includes('darkvision')
    || type.includes('truesight')
    || type.includes('telepathy')
    || type.includes('underwaterbreathing')
  ) return 'Senses & Awareness';

  if (
    type.includes('speed')
    || type.includes('fly')
    || type.includes('climb')
    || type.includes('swim')
    || type.includes('teleport')
    || type.includes('mobility')
    || type.includes('reach')
    || type.includes('jump')
  ) return 'Movement';

  if (
    type.includes('proficiency')
    || type.includes('training')
    || type.includes('expertise')
    || type.includes('language')
    || type.includes('tool')
  ) return 'Proficiencies';

  if (
    type.includes('attack')
    || type.includes('damage')
    || type.includes('crit')
    || type.includes('initiative')
    || type.includes('save')
    || type.includes('extra')
    || type.includes('reroll')
    || type.includes('d20')
  ) return 'Combat';

  if (
    type.includes('spell')
    || type.includes('cantrip')
    || type.includes('magic')
    || type.includes('metamagic')
    || type.includes('summon')
  ) return 'Magic';

  return 'Passive Traits';
}

export function collectEffectCategories(character = {}) {
  const grouped = {};
  collectSheetEffects(character).forEach((effect) => {
    const cat = effectCategory(effect);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(effect);
  });
  return grouped;
}

// Known sense-effect type tokens. Adapters may register either `type:'sense'`
// (+ senseType) or the sense name directly (e.g. Shadow Arts → type:'darkvision').
const SENSE_EFFECT_TYPES = [
  'sense', 'darkvision', 'devilssight', 'blindsight', 'truesight', 'tremorsense',
  'telepathy', 'underwaterbreathing',
];

export function collectSenseEffects(character = {}) {
  return collectSheetEffects(character).filter((effect) => {
    if (effect.senseType) return true;
    const type = effectKey(effect.type);
    return SENSE_EFFECT_TYPES.some((token) => type.includes(token));
  });
}

export function collectMovementEffects(character = {}) {
  return collectSheetEffects(character).filter((effect) => {
    const type = effectKey(effect.type);
    return type.includes('speed')
      || type.includes('fly')
      || type.includes('climb')
      || type.includes('swim')
      || type.includes('teleport')
      || type.includes('mobility')
      || type.includes('reach')
      || type.includes('jump');
  });
}

export function collectResistanceEffects(character = {}) {
  return collectSheetEffects(character).filter((effect) => effectKey(effect.type).includes('resistance'));
}

export function collectPreviewEffectProficiencySections(character = {}) {
  const sections = new Map();

  const add = (title, item) => {
    const label = displayLabel(item);
    if (!label) return;
    if (!sections.has(title)) sections.set(title, new Set());
    sections.get(title).add(label);
  };

  collectSheetEffects(character).forEach((effect) => {
    const type = effectKey(effect.type);
    const summary = effectSummary(effect, character);
    const source = effect.ownerName ? ` (${effect.ownerName})` : '';

    if (type.includes('armortraining')) {
      asArray(effect.values).forEach((value) => add('Armor Training', `${displayLabel(value)}${source}`));
    } else if (type.includes('weapontraining')) {
      asArray(effect.values).forEach((value) => add('Weapon Training', `${displayLabel(value)}${source}`));
    } else if (type.includes('toolproficiency')) {
      asArray(effect.values).forEach((value) => add('Tools', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Tools', `${summary}${source}`);
    } else if (type.includes('skillproficiency')) {
      asArray(effect.values).forEach((value) => add('Skills', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Skills', `${summary}${source}`);
    } else if (type.includes('expertise')) {
      asArray(effect.values).forEach((value) => add('Expertise', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Expertise', `${summary}${source}`);
    } else if (type.includes('language')) {
      asArray(effect.values).forEach((value) => add('Languages', `${displayLabel(value)}${source}`));
      if (!effect.values && summary) add('Languages', `${summary}${source}`);
    }
  });

  return [...sections.entries()].map(([title, set]) => ({
    title,
    items: [...set],
  }));
}
