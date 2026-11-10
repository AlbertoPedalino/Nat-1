import { finalAbilityModifier } from './abilityScores.js';
import { getProficiencyBonus } from './proficiency.js';

// The saving throw DC of a feature that is not a spell: 8 + the ability's
// modifier + the Proficiency Bonus (Breath Weapon, Death Coil, War Stomp…).
// A list of abilities is the player's choice among them (Battle Master
// maneuvers: Strength or Dexterity): the best one counts.
export function featureSaveDc(character, ability) {
  const modifier = Math.max(...[].concat(ability).map((key) => finalAbilityModifier(character, key)));
  return 8 + modifier + getProficiencyBonus(character);
}

// An adapter card's `inlinePills` showing that DC. `minLevel`: the level the
// save arrives at, when it is later than the card (Telekinetic Thrust on
// Psionic Strike).
export function saveDcPills(ability, { minLevel = 0 } = {}) {
  return ({ character, ownerLevel }) => (
    Number(ownerLevel || 0) >= minLevel ? [{ label: 'Save DC', value: featureSaveDc(character, ability) }] : []
  );
}
