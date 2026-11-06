// The ability modifier: (score - 10) / 2, rounded down. The one place it is
// computed — the sheet, the builder, adapters, monsters and companions all
// read it from here. A missing score, or one that is not a number, counts as
// 10 (modifier 0).
export function abilityModifier(score) {
  const n = score == null || score === '' ? NaN : Number(score);
  return Math.floor(((Number.isFinite(n) ? n : 10) - 10) / 2);
}

