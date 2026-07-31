import { installedRegistry } from '../../../adapters/index.js';
import {
  enforceAttunementRules,
  resolveAttunementLimit,
} from '../../../shared/character/itemAttunement.js';
import { collectSheetEffects } from './sheetEffects.js';

function hasSpellcastingConfig(config) {
  return Boolean(config?.spellcasting && Object.keys(config.spellcasting).length);
}

export function characterCanCastSpells(character) {
  if ((character?.spellSnapshots || []).length) return true;

  const classes = [
    { name: character?.className, subclass: character?.subclassShortName },
    ...((character?.extraClasses || []).map((entry) => ({
      name: entry?.name,
      subclass: entry?.subclassShortName,
    }))),
  ].filter((entry) => entry.name);

  if (classes.some((entry) => (
    hasSpellcastingConfig(installedRegistry.getClassRuntimeConfig(entry.name))
    || hasSpellcastingConfig(installedRegistry.getSubclassRuntimeConfig(entry.name, entry.subclass))
  ))) return true;

  return hasSpellcastingConfig(
    installedRegistry.getSpeciesRuntimeConfig(character?.speciesName, character?.speciesSource),
  );
}

export function getCharacterAttunementState(character) {
  return {
    limit: resolveAttunementLimit(collectSheetEffects(character)),
    context: { isSpellcaster: characterCanCastSpells(character) },
  };
}

export function normalizeCharacterAttunement(character, inventory = character?.inventory) {
  const state = getCharacterAttunementState(character);
  return enforceAttunementRules(inventory, { ...state, character });
}
