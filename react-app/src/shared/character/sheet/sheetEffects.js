import { collectOwnerEntries } from './adapterOwners.js';
import { asArray } from '../../lists.js';
import { effectKey, displayLabel, effectSummary } from './sheetEffectText.js';

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

    // The fuller note of two otherwise identical effects wins.
    if (String(effect.note || '').length > String(existing.note || '').length) byKey.set(key, effect);
  });

  return [...byKey.values()];
}

// Every sheet effect in force on the character, from its classes, subclasses,
// species and feats (adapterOwners.js), each annotated with its owner.
export function collectSheetEffects(character = {}) {
  return dedupeEffects(collectOwnerEntries(character, 'SheetEffects').map(({ entry, owner }) => annotate(entry, {
    ownerName: owner.name,
    ownerType: owner.kind,
    ownerLevel: owner.level,
    sourceKey: owner.sourceKey,
  })));
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
