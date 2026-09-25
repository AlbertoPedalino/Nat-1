// Character fields that exist only while a sheet is open.
//
// `optionalFeatureEntries` is the optional-feature catalog (invocations,
// maneuvers, fighting styles… from optionalfeatures.json) that CharacterSheet
// attaches to the character it renders, so adapters and tabs can resolve live
// rule text. It is the same for every character and holds no choice of the
// player (those live in `choices`); the sheet rebuilds it on every open.
//
// None of these may be persisted — not to local storage, not to
// `characters.data`, not by the builder. Every persistence boundary strips
// them here. The database removes the same keys on write and leaves them out
// of `hpBasis` (13_character_vitals.sql, `character_runtime_only_keys()`); a
// test keeps both lists equal.

export const RUNTIME_ONLY_CHARACTER_FIELDS = Object.freeze(['optionalFeatureEntries']);

// The character as it may be stored. Returns the same object when there is
// nothing to strip.
export function stripRuntimeOnlyCharacterFields(character) {
  if (!character || typeof character !== 'object' || Array.isArray(character)) return character;
  if (!RUNTIME_ONLY_CHARACTER_FIELDS.some((field) => Object.hasOwn(character, field))) return character;
  const out = { ...character };
  RUNTIME_ONLY_CHARACTER_FIELDS.forEach((field) => { delete out[field]; });
  return out;
}

// A stored character (`stored`) back in memory, keeping the runtime fields the
// open sheet already had (`current`).
export function withRuntimeOnlyCharacterFields(stored, current) {
  if (!stored || !current) return stored;
  const runtime = RUNTIME_ONLY_CHARACTER_FIELDS.filter((field) => current[field] !== undefined);
  if (!runtime.length) return stored;
  const out = { ...stored };
  runtime.forEach((field) => { out[field] = current[field]; });
  return out;
}
