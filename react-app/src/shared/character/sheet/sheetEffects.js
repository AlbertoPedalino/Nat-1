import { adapterRegistry } from '../../../adapters/registry.js';
import { matchesRequiredChoice } from '../progression/lineageMatch.js';
import { inventoryHasFlag } from '../progression/choiceUtils.js';
import { ownedFeatNames } from '../progression/selectedFeats.js';
import { classEntities } from '../progression/classLevel.js';
import { asArray } from '../../lists.js';
import { effectKey, displayLabel, effectSummary } from './sheetEffectText.js';

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

export function collectSheetEffects(character = {}) {
  const out = [];

  classEntities(character).forEach((entity) => {
    collectFromList(out, adapterRegistry.getClassSheetEffects(entity.className), {
      ownerName: entity.className,
      ownerType: 'class',
      ownerLevel: entity.level,
      sourceKey: entity.className,
    }, character);

    if (entity.subclassShortName) {
      collectFromList(out, adapterRegistry.getSubclassSheetEffects(entity.className, entity.subclassShortName), {
        ownerName: entity.subclassShortName,
        ownerType: 'subclass',
        ownerLevel: entity.level,
        sourceKey: `${entity.className}_${entity.subclassShortName}`,
      }, character);
    }
  });

  if (character.speciesName) {
    collectFromList(out, adapterRegistry.getSpeciesSheetEffects(character.speciesName, character.speciesSource), {
      ownerName: character.speciesName,
      ownerType: 'species',
      ownerLevel: Number(character.level || 1),
      sourceKey: `${character.speciesName}_${character.speciesSource || ''}`,
    }, character);
  }

  ownedFeatNames(character).forEach((feat) => {
    collectFromList(out, adapterRegistry.getFeatSheetEffects(feat), {
      ownerName: feat,
      ownerType: 'feat',
      ownerLevel: Number(character.level || 1),
      sourceKey: feat,
    }, character);
  });

  return dedupeEffects(out);
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
