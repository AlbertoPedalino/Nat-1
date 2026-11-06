// The ability modifier: (score - 10) / 2, rounded down. The one place it is
// computed — the sheet, the builder, adapters, monsters and companions all
// read it from here. A missing score, or one that is not a number, counts as
// 10 (modifier 0).
export function abilityModifier(score) {
  const n = score == null || score === '' ? NaN : Number(score);
  return Math.floor(((Number.isFinite(n) ? n : 10) - 10) / 2);
}

// The modifier of a character's final score (`finalScores`, kept by the
// sheet), as adapters and scaling formulas read it.
export function finalAbilityModifier(character, ability) {
  return abilityModifier(character?.finalScores?.[String(ability).toLowerCase()]);
}
