// Druid Wild Companion (XPHB 2024) — active summoned familiar state.
//
// Wild Companion (Druid lv.2): as a Magic action you expend a use of Wild Shape
// (or a spell slot) to cast Find Familiar without Material components; the
// familiar is Fey and disappears when you finish a Long Rest. Find Familiar's
// eligible forms are any Beast of Challenge Rating 0 (XPHB 2024) — see
// findFamiliarBeasts in beasts.js.
//
// Shape of `C.wildCompanion` (null when no familiar is summoned):
//   { beast: <normalizeBeast snapshot> }   // name, abilities, ac, hp, actions…
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

// Patch for summoning a familiar in the chosen Beast form. The caller spends the
// Wild Shape use (or a spell slot) separately; this only records the form. Only
// one familiar may exist, so re-summoning simply replaces the active form.
export function summonWildCompanionPatch(beast) {
  if (!beast) return null;
  return { wildCompanion: { beast } };
}

// Patch for dismissing the familiar — manual dismissal or the Long Rest cleanup
// (RAW: the Wild Companion familiar vanishes when you finish a Long Rest).
export function dismissWildCompanionPatch() {
  return { wildCompanion: null };
}
