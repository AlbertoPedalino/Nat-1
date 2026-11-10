import { characterOwners, ownerEntries } from '../../../shared/character/sheet/adapterOwners.js';
import {
  enforceAttunementRules,
  resolveAttunementLimit,
} from '../../../shared/character/inventory/itemAttunement.js';
import { collectSheetEffects } from '../../../shared/character/sheet/sheetEffects.js';

function hasSpellcastingConfig(config) {
  return Boolean(config?.spellcasting && Object.keys(config.spellcasting).length);
}

export function characterCanCastSpells(character) {
  if ((character?.spellSnapshots || []).length) return true;

  // Any class, subclass or species with a spellcasting config (feats have none).
  return characterOwners(character).some((owner) => hasSpellcastingConfig(ownerEntries(owner, 'RuntimeConfig')));
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
