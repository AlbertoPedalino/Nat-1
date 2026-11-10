import { warlockLevel } from '../../../shared/character/progression/warlockUtils.js';
import { stripSource } from '../../../shared/content/nameKeys.js';
import { baseChoiceKey } from '../../../shared/character/progression/choiceUtils.js';

// The Warlock's Eldritch Invocation data and the pure helpers its adapter
// (warlock.js) builds on. A data module: it has no install function.

// The Eldritch Invocations themselves — names, levels, prerequisites and
// descriptions — come from optionalfeatures.json (featureType 'EI', read through
// optionalFeatureOptions), in the builder (ClassStep) and the sheet (FeaturesTab).
// Invocations that can be taken more than once (XPHB): the one fact about them
// the optional-feature data does not carry.
export const REPEATABLE_INVOCATIONS = Object.freeze(['Lessons of the First Ones']);

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
