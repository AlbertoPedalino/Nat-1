/**
 * Canonical Proficiency Bonus.
 *
 * Single source of truth for PB across the app (character sheet, rest
 * resources, spell free-casts). Do NOT recompute PB inline with
 * `Math.floor((level - 1) / 4) + 2`: that ignores the PB bonus granted by
 * magic items. Always call `getProficiencyBonus(character)`.
 */
import { getItemProficiencyBonus } from './itemEffects.js';

export const PROFICIENCY_BONUS_BY_LEVEL = [null, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6];

export function getProficiencyBonus(character) {
  const base = character ? (PROFICIENCY_BONUS_BY_LEVEL[character.level] || 2) : 2;
  return base + getItemProficiencyBonus(character);
}
