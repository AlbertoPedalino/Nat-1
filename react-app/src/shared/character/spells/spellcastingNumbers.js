import { getProficiencyBonus } from '../progression/proficiency.js';
import { finalAbilityModifier } from '../progression/abilityScores.js';
import { characterItemBonuses } from '../inventory/itemBonus.js';
import { getSpellSaveDcBonus } from '../sheet/effectBonuses.js';

// A caster's spell attack bonus and spell save DC for one spellcasting
// ability, as the sheet prints them: Proficiency Bonus + the ability's
// modifier, plus magic-item spell attack / save DC bonuses (none while Wild
// Shaped) and effect-granted save DC bonuses. Every spell, and every companion
// or summon that uses "your spell attack modifier" and "your spell save DC"
// (XPHB 2024), reads them from here.
export function spellcastingNumbers(C, ability, { inventory } = {}) {
  const proficiency = getProficiencyBonus(C);
  const modifier = finalAbilityModifier(C, ability);
  const items = characterItemBonuses(C, inventory ?? C?.inventory ?? []);
  return {
    abilityModifier: modifier,
    attack: proficiency + modifier + (Number(items.spellAttack) || 0),
    dc: 8 + proficiency + modifier + (Number(items.spellSaveDc) || 0) + getSpellSaveDcBonus(C),
  };
}
