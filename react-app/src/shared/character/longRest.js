import { dismissWildCompanionPatch } from './wildCompanionForm.js';

// Character-level fields reset when a Long Rest is finished.
//
// Most rest state lives elsewhere (sheet state, resources, toggles) and is
// handled by their own systems. A few features store transient state directly on
// the character (e.g. a summoned form). Each such feature contributes its reset
// here so CharacterSheet's rest handler stays one merge instead of accumulating
// per-feature special-cases — add a new feature by adding a line below.
export function longRestCharacterPatch(C) {
  const patch = {};
  // Druid Wild Companion familiar (XPHB 2024) vanishes on a Long Rest.
  if (C?.wildCompanion) Object.assign(patch, dismissWildCompanionPatch());
  return patch;
}
