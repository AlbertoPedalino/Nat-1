// Druid Wild Companion (XPHB 2024) — active summoned familiar state.
//
// Wild Companion (Druid lv.2): as a Magic action you expend a use of Wild Shape
// (or a spell slot) to cast Find Familiar without Material components; the
// familiar is Fey and disappears when you finish a Long Rest. Find Familiar's
// eligible forms are any Beast of Challenge Rating 0 (XPHB 2024) — see
// findFamiliarBeasts in beasts.js.
//
// Shape of `C.wildCompanion` (null when no familiar is summoned):
//   { beast: <normalizeBeast snapshot>, currentHP: <number> }
//   beast: name, abilities, ac, hp, actions…; currentHP: live hit points (the
//   familiar is a separate creature, so it takes damage independently of the Druid)
//
// Unlike Wild Shape, summoning a familiar does NOT transform the Druid: the
// familiar is a separate creature, so this grants no stat/AC/HP overrides. This
// module is just the accessor + patch builders — there is no override layer.

export function getActiveWildCompanion(C) {
  const wc = C?.wildCompanion;
  return wc && wc.beast ? wc : null;
}

export function hasWildCompanion(C) {
  return getActiveWildCompanion(C) != null;
}

// Max hit points for a familiar form (the Beast's average HP).
const beastMaxHp = (beast) => Math.max(0, Number(beast?.hp?.average) || 0);

// Patch for summoning a familiar in the chosen Beast form. The caller spends the
// Wild Shape use (or a spell slot) separately; this only records the form. Only
// one familiar may exist, so re-summoning simply replaces the active form (and
// resets its HP to full).
export function summonWildCompanionPatch(beast) {
  if (!beast) return null;
  return { wildCompanion: { beast, currentHP: beastMaxHp(beast) } };
}

// Live { current, max } HP for the active familiar (null when none). currentHP is
// always seeded at summon (summonWildCompanionPatch), so it's read as-is, clamped.
export function getWildCompanionHp(C) {
  const wc = getActiveWildCompanion(C);
  if (!wc) return null;
  const max = beastMaxHp(wc.beast);
  return { current: Math.max(0, Math.min(max, Number(wc.currentHP) || 0)), max };
}

// Patch that sets the familiar's current HP, clamped to [0, max]. Preserves the
// beast form. No-op (null) when no familiar is active.
export function setWildCompanionHpPatch(C, nextCurrent) {
  const wc = getActiveWildCompanion(C);
  if (!wc) return null;
  const max = beastMaxHp(wc.beast);
  const clamped = Math.max(0, Math.min(max, Math.round(Number(nextCurrent) || 0)));
  return { wildCompanion: { ...wc, currentHP: clamped } };
}

// Patch for dismissing the familiar — manual dismissal or the Long Rest cleanup
// (RAW: the Wild Companion familiar vanishes when you finish a Long Rest).
export function dismissWildCompanionPatch() {
  return { wildCompanion: null };
}
