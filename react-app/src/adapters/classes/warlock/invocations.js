import { warlockLevel } from '../../../shared/character/progression/warlockUtils.js';
import { stripSource } from '../../../shared/content/nameKeys.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';

// The Warlock's Eldritch Invocation data and the pure helpers its adapter
// (warlock.js) builds on. A data module: it has no install function.

// Eldritch Invocations XPHB 2024 — structural data only (name, minLevel, prereq
// invocation, repeatable). Descriptions are NOT stored here: they are resolved live
// from optionalfeatures.json (featureType 'EI') and rendered as rich text in both the
// builder (ClassStep) and the sheet (FeaturesTab).
export const INVOCATIONS = [
  { name: 'Agonizing Blast', minLevel: 2, prereq: null },
  { name: 'Armor of Shadows', minLevel: 1, prereq: null },
  { name: 'Ascendant Step', minLevel: 5, prereq: null },
  { name: 'Devil\'s Sight', minLevel: 2, prereq: null },
  { name: 'Devouring Blade', minLevel: 12, prereq: 'Thirsting Blade' },
  { name: 'Eldritch Mind', minLevel: 1, prereq: null },
  { name: 'Eldritch Smite', minLevel: 5, prereq: 'Pact of the Blade' },
  { name: 'Eldritch Spear', minLevel: 2, prereq: null },
  { name: 'Fiendish Vigor', minLevel: 1, prereq: null },
  { name: 'Gaze of Two Minds', minLevel: 5, prereq: null },
  { name: 'Gift of the Depths', minLevel: 5, prereq: null },
  { name: 'Gift of the Protectors', minLevel: 9, prereq: 'Pact of the Tome' },
  { name: 'Investment of the Chain Master', minLevel: 5, prereq: 'Pact of the Chain' },
  { name: 'Lessons of the First Ones', minLevel: 2, prereq: null, repeatable: true },
  { name: 'Lifedrinker', minLevel: 9, prereq: 'Pact of the Blade' },
  { name: 'Mask of Many Faces', minLevel: 1, prereq: null },
  { name: 'Master of Myriad Forms', minLevel: 5, prereq: null },
  { name: 'Misty Visions', minLevel: 1, prereq: null },
  { name: 'One with Shadows', minLevel: 5, prereq: null },
  { name: 'Otherworldly Leap', minLevel: 2, prereq: null },
  { name: 'Pact of the Blade', minLevel: 1, prereq: null },
  { name: 'Pact of the Chain', minLevel: 1, prereq: null },
  { name: 'Pact of the Tome', minLevel: 1, prereq: null },
  { name: 'Repelling Blast', minLevel: 2, prereq: null },
  { name: 'Thirsting Blade', minLevel: 5, prereq: 'Pact of the Blade' },
  { name: 'Visions of Distant Realms', minLevel: 9, prereq: null },
  { name: 'Whispers of the Grave', minLevel: 7, prereq: null },
  { name: 'Witch Sight', minLevel: 15, prereq: null },
];

// XPHB 2024 progression: total invocations per level [1,3,3,3,5,5,6,6,7,7,7,8,8,8,9,9,9,10,10,10]
// Threshold when each invocation slot unlocks (slot 6 at lv7, slot 7 at lv9, slot 8 at lv12...):
export const INVOCATION_SLOT_LEVELS = [1, 2, 2, 5, 5, 7, 9, 12, 15, 18];

// ── Modifier-cantrip invocations (Agonizing/Repelling Blast, Eldritch Spear) ──
// Warlock damage cantrips eligible to receive one of these invocations. This single
// list drives BOTH the builder's selectable options (passed via the choice spellFilter)
// and which cantrips get a sheet modifier registered, so the two can never desync.
export const MODIFIER_ELIGIBLE_CANTRIPS = [
  'Eldritch Blast', 'Chill Touch', 'Mind Sliver', 'Poison Spray', 'Thunderclap', 'Toll the Dead', 'True Strike',
];

// Mechanical effect each modifier-cantrip invocation applies to a chosen cantrip's
// resolved data, keyed by the invocation slug in WARLOCK_MODIFIER_CANTRIP_INVOCATIONS.
// Optional `apply(out, C)` mutates the cantrip data (damage/range). The human-readable
// description is NOT stored here — it is resolved live from optionalfeatures.json.
export const MODIFIER_CANTRIP_EFFECTS = {
  agonizing_blast: { apply: function (out) { out.dmgBonusPerBeam = 'cha'; } },
  repelling_blast: {},
  eldritch_spear: { apply: function (out, C) { out.range = (30 * Math.max(1, warlockLevel(C))) + ' ft'; } },
};

function choiceValuesByBase(C, baseKey, fallback) {
  if (!C?.choices) return fallback ? [fallback] : [];
  var out = [];
  Object.entries(C.choices).forEach(function(entry) {
    var key = baseChoiceKey(entry[0]);
    if (key === baseKey || key.startsWith(baseKey + '_')) {
      var value = stripSource(entry[1]);
      if (value) out.push(value);
    }
  });
  if (!out.length && fallback) out.push(fallback);
  return out;
}

// Whether a choice keyed `baseKey` (or `baseKey_N`) picked `cantripName`.
export function warlockChoiceMatches(C, baseKey, cantripName, fallback) {
  return choiceValuesByBase(C, baseKey, fallback).some(function(value) {
    return value === cantripName;
  });
}
