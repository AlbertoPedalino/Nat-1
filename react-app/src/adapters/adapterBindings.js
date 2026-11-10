import {
  ALL_LANGUAGES,
  ALL_TOOLS,
  ARTISAN_TOOLS,
  MUSICAL_INSTRUMENTS,
} from '../shared/content/rulesVocabulary.js';
import {
  getWeaponMasteryChoiceCount,
  getWeaponMasteryChoiceNames,
  WEAPON_MASTERY_RULES,
} from '../shared/character/combat/weaponMastery.js';
import { KEYED_SLOTS } from './registry.js';

export function splitClassSubclass(rawKey) {
  const value = String(rawKey || '');
  const idx = value.indexOf('_');
  return idx < 0 ? [value, ''] : [value.slice(0, idx), value.slice(idx + 1)];
}

export function splitSpecies(rawKey) {
  const value = String(rawKey || '');
  const idx = value.lastIndexOf('_');
  return idx < 0 ? [value, ''] : [value.slice(0, idx), value.slice(idx + 1)];
}

// What an adapter file gets to register with: every registry method, except
// that a subclass or species register takes one raw key instead of two
// ("Wizard_Evoker", "Elf_XPHB") and splits it here; plus the vocabulary lists
// and helpers adapter files share.
export function createAdapterBindings(registry, context = {}) {
  const splitRegisters = {};
  KEYED_SLOTS.forEach((slot) => {
    if (slot.kinds.includes('Subclass')) {
      const method = `registerSubclass${slot.register}`;
      splitRegisters[method] = (rawKey, value) => registry[method](...splitClassSubclass(rawKey), value);
    }
    if (slot.kinds.includes('Species')) {
      const method = `registerSpecies${slot.register}`;
      splitRegisters[method] = (rawKey, value) => registry[method](...splitSpecies(rawKey), value);
    }
  });

  return {
    ...registry,
    ...splitRegisters,
    registerSpeciesSheetCommonChoiceMeta: (rawKey, meta = {}) => splitRegisters.registerSpeciesSheetChoiceMeta(rawKey, meta),
    _ARTISAN_TOOLS: ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS: MUSICAL_INSTRUMENTS,
    _ALL_LANGS: ALL_LANGUAGES,
    _ALL_TOOLS: ALL_TOOLS,
    allItemsDb: context.items || [],
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
  };
}


