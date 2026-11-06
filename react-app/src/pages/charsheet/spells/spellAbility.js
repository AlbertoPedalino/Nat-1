import { adapterRegistry as installedRegistry } from '../../../adapters/registry.js';
import { choiceSpellSlotKey, choiceValue } from './spellChoiceKeys.js';
import { abilityKey } from '../../../shared/content/rulesVocabulary.js';

// Which ability a spell is cast with: the character's default, a spell row's
// own (its grant, its owning class), and a builder choice's chosen ability.

// The ability chosen for a spell picked in a builder choice (feat slot's
// `<slot>_spell_ability`, or the species spell ability), else null.
export function getChoiceSpellAbility(C, key) {
  const slotKey = choiceSpellSlotKey(key);
  if (slotKey) {
    const abilityChoiceKey = `${slotKey}_spell_ability`;
    const raw = C?.choices?.[abilityChoiceKey];
    const val = choiceValue(raw);
    if (val) {
      const normalized = abilityKey(val);
      if (normalized) return normalized;
    }
  }
  if (String(key || '').startsWith('species_')) {
    const speciesAbility = C?.normalizedChoices?.species?.spellAbility
      || choiceValue(C?.choices?.species_spell_ability);
    const normalized = abilityKey(speciesAbility);
    if (normalized) return normalized;
  }
  return null;
}

export function getSpellAbility(C) {
  const clsCfg = installedRegistry.getClassRuntimeConfig(C?.className)?.spellcasting;
  const subCfg = installedRegistry.getSubclassRuntimeConfig(C?.className, C?.subclassShortName)?.spellcasting;
  return String(subCfg?.ability || clsCfg?.ability || C?.choices?.species_spell_ability || 'cha').toLowerCase();
}

export function resolveEntrySpellAbility(C, entry = {}) {
  const raw = entry.spellcastingAbility || entry.castAbility || entry.spellAbility || entry.ability || null;
  const normalized = abilityKey(raw);
  if (normalized) return normalized;
  if (entry.ownerClassName) {
    const clsCfg = installedRegistry.getClassRuntimeConfig(entry.ownerClassName)?.spellcasting;
    const subCfg = installedRegistry.getSubclassRuntimeConfig(entry.ownerClassName, entry.ownerSubclassShortName)?.spellcasting;
    const ownerAbility = subCfg?.ability || clsCfg?.ability || null;
    if (ownerAbility) return String(ownerAbility).toLowerCase();
  }
  const speciesAbility = choiceValue(C?.choices?.species_spell_ability);
  if (speciesAbility) {
    const sa = abilityKey(speciesAbility);
    if (sa) return sa;
  }
  const clsCfg = installedRegistry.getClassRuntimeConfig(C?.className)?.spellcasting;
  const subCfg = installedRegistry.getSubclassRuntimeConfig(C?.className, C?.subclassShortName)?.spellcasting;
  const primaryAbility = subCfg?.ability || clsCfg?.ability || null;
  if (primaryAbility) return String(primaryAbility).toLowerCase();
  return null;
}

export function getSpellAbilityForEntry(C, entry = {}) {
  return resolveEntrySpellAbility(C, entry) || getSpellAbility(C);
}
