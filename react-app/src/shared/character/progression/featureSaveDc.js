import { finalAbilityModifier } from './abilityScores.js';
import { getProficiencyBonus } from './proficiency.js';

// The saving throw DC of a feature that is not a spell: 8 + the ability's
// modifier + the Proficiency Bonus (Breath Weapon, Death Coil, War Stomp…).
export function featureSaveDc(character, ability) {
  return 8 + finalAbilityModifier(character, ability) + getProficiencyBonus(character);
}
