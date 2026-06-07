/**
 * Shared resolver for declarative scaling formulas used by limited-use
 * features (sheet resource `max`, spell free-cast `usesFormula`).
 *
 * Supported string formulas:
 *   - 'proficiencyBonus' | 'pb'   → Proficiency Bonus (item PB bonus included)
 *   - 'abilityMod:<stat>'         → ability modifier from canonical finalScores
 *
 * Returns the raw numeric value, or null when `formula` is not a recognized
 * string. Callers apply their own clamping (resources floor at 0, free-casts
 * at 1). Keep this the single place that maps formula strings to numbers so
 * the two callers cannot drift apart.
 */
import { getProficiencyBonus } from './proficiency.js';

function abilityModFromFinal(character, ability) {
  const score = Number(character?.finalScores?.[String(ability).toLowerCase()] ?? 10);
  return Math.floor((score - 10) / 2);
}

export function resolveScalingFormula(formula, character) {
  if (typeof formula !== 'string') return null;
  const key = formula.toLowerCase();
  if (key === 'proficiencybonus' || key === 'pb') return getProficiencyBonus(character);
  if (key.startsWith('abilitymod:')) return abilityModFromFinal(character, key.split(':')[1]);
  return null;
}
