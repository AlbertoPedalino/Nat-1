export function getClassCantripLimit(profile, level) {
  if (!profile || level < 1) return 0;
  const idx = Math.min(level - 1, 19);
  return profile.cantripKnown?.[idx] ?? profile.cantripProgression?.[idx] ?? 0;
}

export function getClassPreparedSpellLimit(profile, level) {
  if (!profile || level < 1) return 0;
  const idx = Math.min(level - 1, 19);
  const fromTable = profile.preparedSpellsProgression?.[idx] ?? null;
  if (fromTable != null) return fromTable;
  const fromKnown = profile.spellsKnown?.[idx] ?? null;
  if (fromKnown != null) return fromKnown;
  return 0;
}

export function getClassSpellLimits(profile, level) {
  return {
    cantrips: getClassCantripLimit(profile, level),
    spells: getClassPreparedSpellLimit(profile, level),
  };
}
