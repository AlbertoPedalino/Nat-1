import { createAdapterBindings } from '../../adapterBindings.js';
import { warlockHasInvocation, warlockLevel, warlockKnownInvocations, warlockInvocationSelections, WARLOCK_MODIFIER_CANTRIP_INVOCATIONS, warlockModifierCantripChoiceKey } from '../../../shared/character/warlockUtils.js';
import { registerChoiceLevelMap } from '../../../shared/character/choiceLevels.js';
import { buildOptionalFeatureEntryLookup } from '../../../shared/character/optionalFeatures.js';
import { entriesToPlainText } from '../../../shared/character/spellEntries.js';

export default function install(registry, context = {}) {
  const {
    SKILLS,
    _ARTISAN_TOOLS,
    _MUSICAL_INSTRUMENTS,
    _GAMING_SETS,
    _VEHICLE_TOOLS,
    _STD_LANGS,
    _EXOTIC_LANGS,
    _ALL_LANGS,
    _ALL_TOOLS,
    allItemsDb,
    registerClassAdapter,
    getClassAdapter,
    registerSubclassAdapter,
    getSubclassAdapter,
    registerSpeciesAdapter,
    getSpeciesAdapter,
    registerFeatAdapter,
    getFeatAdapter,
    registerClassSheetActions,
    getClassSheetActions,
    registerSubclassSheetActions,
    getSubclassSheetActions,
    registerSpeciesSheetActions,
    getSpeciesSheetActions,
    registerFeatSheetActions,
    getFeatSheetActions,
    registerClassSheetResources,
    getClassSheetResources,
    registerSubclassSheetResources,
    getSubclassSheetResources,
    registerSpeciesSheetResources,
    getSpeciesSheetResources,
    registerFeatSheetResources,
    getFeatSheetResources,
    registerClassSheetEffects,
    getClassSheetEffects,
    registerSubclassSheetEffects,
    getSubclassSheetEffects,
    registerSpeciesSheetEffects,
    getSpeciesSheetEffects,
    registerFeatSheetEffects,
    getFeatSheetEffects,
    registerClassRuntimeConfig,
    getClassRuntimeConfig,
    registerSubclassRuntimeConfig,
    getSubclassRuntimeConfig,
    registerSpeciesRuntimeConfig,
    getSpeciesRuntimeConfig,
    registerClassSheetChoiceMeta,
    getClassSheetChoiceMeta,
    registerSubclassSheetChoiceMeta,
    getSubclassSheetChoiceMeta,
    registerSpeciesSheetChoiceMeta,
    getSpeciesSheetChoiceMeta,
    registerClassSheetCommonChoiceMeta,
    registerSubclassSheetCommonChoiceMeta,
    registerSpeciesSheetCommonChoiceMeta,
    registerItemFlagDef,
    getItemFlagDef,
    getAllItemFlagDefs,
    registerWeaponAbilityOverride,
    getWeaponAbilityOverrides,
    registerClassSheetFeatureFilter,
    getClassSheetFeatureFilters,
    registerSubclassSheetFeatureFilter,
    getSubclassSheetFeatureFilters,
    registerSpeciesSheetFeatureFilter,
    getSpeciesSheetFeatureFilters,
    registerClassSheetProficiencies,
    getClassSheetProficiencies,
    registerSubclassSheetProficiencies,
    getSubclassSheetProficiencies,
    registerSpeciesSheetProficiencies,
    getSpeciesSheetProficiencies,
    registerClassSheetSpellModifiers,
    getClassSheetSpellModifiers,
    registerSubclassSheetSpellModifiers,
    getSubclassSheetSpellModifiers,
    registerSpeciesSheetSpellModifiers,
    getSpeciesSheetSpellModifiers,
    registerClassChoiceKeyFilter,
    getClassChoiceKeyFilter,
    registerClassChoiceLabelProvider,
    getClassChoiceLabelProvider,
    registerSpeciesSheetHpBonus,
    getSpeciesSheetHpBonus,
    registerClassAtWillSpells,
    getClassAtWillSpells,
    registerSpeciesLongRestGrants,
    getSpeciesLongRestGrants,
    registerResourceSideEffect,
    getResourceSideEffect,
    registerSubclassChoiceDetailDataProvider,
    getSubclassChoiceDetailDataProvider,
    registerGlobalClassAdapter,
    getGlobalClassAdapters,
    registerGlobalSubclassAdapter,
    getGlobalSubclassAdapters,
    registerGlobalSpeciesAdapter,
    getGlobalSpeciesAdapters,
    registerGlobalFeatAdapter,
    getGlobalFeatAdapters,
    registerGlobalSpellAdapter,
    getGlobalSpellAdapters,
    registerGlobalItemAdapter,
    getGlobalItemAdapters,
    registerCantripData,
    getCantripData,
    registerCantripDataModifier,
    getCantripDataModifiers,
    registerSpellData,
    getSpellData,
    getGenericSpeciesChoiceSpecs,
    getGenericBackgroundChoiceSpecs,
    getGenericBackgroundChoiceMeta,
    getGenericBackgroundOriginFeat,
    registerFeatOwnerKeyPattern,
  } = createAdapterBindings(registry, context);

if (typeof registerFeatOwnerKeyPattern === 'function') {
  registerFeatOwnerKeyPattern(/^(?:mc\d+_)?warlock_lessons(?:_first_ones_origin)?_feat(?:_\d+)?$/i);
}

// Eldritch Invocations XPHB 2024 — structural data only (name, minLevel, prereq
// invocation, repeatable). Descriptions are NOT stored here: they are resolved live
// from optionalfeatures.json (featureType 'EI') and rendered as rich text in both the
// builder (ClassStep) and the sheet (FeaturesTab).
const _INV_DATA = [
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

registerClassSheetChoiceMeta("Warlock", {
  invocationData: _INV_DATA.map(function (inv) {
    return {
      name: inv.name,
      minLevel: inv.minLevel,
      prereq: inv.prereq || null,
      source: inv.source || 'XPHB',
      repeatable: !!inv.repeatable,
    };
  }),
});

// Check if a character has a specific Eldritch Invocation chosen (works for both sheet C and charbuilder char)
function _warlockHasInvocation(C, name) {
  return warlockHasInvocation(C, name);
}

function _warlockAdapterCharacter(localContext) {
  return (localContext && (localContext.character || localContext.char || localContext.C || localContext.activeCharacter))
    || context.character
    || context.char
    || context.C
    || context.activeCharacter
    || ((typeof char !== 'undefined' && char) ? char : null);
}

function _warlockInvocationCount(C, name) {
  if (!C) return 0;
  var target = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return warlockInvocationSelections(C).filter(function (invName) {
    return String(invName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === target;
  }).length;
}

function _warlockInvocationCountScoped(C, name, keyPrefix) {
  if (!C) return 0;
  var target = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return warlockInvocationSelections(C, keyPrefix).filter(function (invName) {
    return String(invName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === target;
  }).length;
}

function _warlockHasInvocationScoped(C, name, keyPrefix) {
  if (!C || !name) return false;
  var target = String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return warlockInvocationSelections(C, keyPrefix).some(function (invName) {
    return String(invName || '').toLowerCase().replace(/[^a-z0-9]/g, '') === target;
  });
}

function _warlockInvocationPrereqMet(C, inv, threshold) {
  if (!inv) return false;
  if (Number(threshold || 0) < Number(inv.minLevel || 1)) return false;
  if (!inv.prereq) return true;
  return _warlockHasInvocation(C, inv.prereq);
}

function _warlockLevel(C) {
  return warlockLevel(C);
}

function _warlockChoiceValue(C, key) {
  if (!C?.choices) return null;
  const direct = C.choices[key];
  if (direct != null) return direct;
  const found = Object.entries(C.choices).find(function (entry) {
    return entry[0].replace(/^mc\d+_/, '') === key;
  });
  return found ? found[1] : null;
}

function _warlockChoiceValuesByBase(C, baseKey, fallback) {
  if (!C?.choices) return fallback ? [fallback] : [];
  var out = [];
  Object.entries(C.choices).forEach(function(entry) {
    var key = entry[0].replace(/^mc\d+_/, '');
    if (key === baseKey || key.startsWith(baseKey + '_')) {
      var value = String(entry[1] || '').split('|')[0].trim();
      if (value) out.push(value);
    }
  });
  if (!out.length && fallback) out.push(fallback);
  return out;
}

function _warlockChoiceMatches(C, baseKey, cantripName, fallback) {
  return _warlockChoiceValuesByBase(C, baseKey, fallback).some(function(value) {
    return value === cantripName;
  });
}

function _knownWarlockInvocationChoices(C) {
  return warlockKnownInvocations(C);
}

// XPHB 2024 progression: total invocations per level [1,3,3,3,5,5,6,6,7,7,7,8,8,8,9,9,9,10,10,10]
// Threshold when each invocation slot unlocks (slot 6 at lv7, slot 7 at lv9, slot 8 at lv12...):
const _INV_LEVELS = [1, 2, 2, 5, 5, 7, 9, 12, 15, 18];

// ── Modifier-cantrip invocations (Agonizing/Repelling Blast, Eldritch Spear) ──
// Warlock damage cantrips eligible to receive one of these invocations. This single
// list drives BOTH the builder's selectable options (passed via the choice spellFilter)
// and which cantrips get a sheet modifier registered, so the two can never desync.
const MODIFIER_ELIGIBLE_CANTRIPS = [
  'Eldritch Blast', 'Chill Touch', 'Mind Sliver', 'Poison Spray', 'Thunderclap', 'Toll the Dead', 'True Strike',
];

// Cantrip range in feet from registered cantrip data; 0 for Touch/Self/unknown.
function _cantripRangeFeet(name) {
  var data = typeof getCantripData === 'function' ? getCantripData(name) : null;
  var match = /(\d+)\s*ft/i.exec(String((data && data.range) || ''));
  return match ? Number(match[1]) : 0;
}

// Eligible cantrips for an invocation, narrowed by its `minRangeFeet` rule if any
// (e.g. Eldritch Spear targets only cantrips with a range of 10 ft or greater).
// Result is cached per slug once cantrip data is available, keeping a stable array
// reference for the builder's memoized option pool.
var _eligibleCantripCache = {};
function _eligibleCantrips(mod) {
  var min = Number(mod.minRangeFeet || 0);
  if (min <= 0) return MODIFIER_ELIGIBLE_CANTRIPS;
  var cached = _eligibleCantripCache[mod.slug];
  if (cached && cached.length) return cached;
  var list = MODIFIER_ELIGIBLE_CANTRIPS.filter(function (n) { return _cantripRangeFeet(n) >= min; });
  if (list.length) _eligibleCantripCache[mod.slug] = list;
  return list;
}

// Mechanical effect each modifier-cantrip invocation applies to a chosen cantrip's
// resolved data, keyed by the invocation slug in WARLOCK_MODIFIER_CANTRIP_INVOCATIONS.
// Optional `apply(out, C)` mutates the cantrip data (damage/range). The human-readable
// description is NOT stored here — it is resolved live from optionalfeatures.json.
const _MODIFIER_CANTRIP_EFFECTS = {
  agonizing_blast: { apply: function (out) { out.dmgBonusPerBeam = 'cha'; } },
  repelling_blast: {},
  eldritch_spear: { apply: function (out, C) { out.range = (30 * Math.max(1, _warlockLevel(C))) + ' ft'; } },
};

registerClassAdapter("Warlock", function (cls, lv, specs, adapterContext = {}) {
  var _charRef = _warlockAdapterCharacter(adapterContext);
  var _choicePrefix = String(adapterContext?.keyPrefix || '');

  function _normInvocation(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // Modifier-cantrip invocations (Agonizing/Repelling Blast, Eldritch Spear) attach a
  // cantrip choice. It is rendered directly under the invocation slot that selected it
  // (interleaved in the loop below) rather than grouped at the end. Precompute the total
  // occurrences so repeated picks get suffixed keys; `seen` advances as slots are walked.
  var _modCantripBySlug = {};
  var _slugByInvocation = {};
  WARLOCK_MODIFIER_CANTRIP_INVOCATIONS.forEach(function (mod) {
    _modCantripBySlug[mod.slug] = {
      mod: mod,
      total: Math.max(1, _warlockInvocationCountScoped(_charRef, mod.invocation, _choicePrefix)),
      seen: 0,
    };
    _slugByInvocation[_normInvocation(mod.invocation)] = mod.slug;
  });

  function _pushModifierCantripChoice(slug) {
    var st = _modCantripBySlug[slug];
    if (!st) return;
    st.seen += 1;
    var mod = st.mod;
    specs.push({
      key: warlockModifierCantripChoiceKey(mod.slug, st.seen, st.total),
      label: st.total > 1
        ? mod.invocation + ' — Warlock Cantrip ' + st.seen
        : mod.invocation + ' — Warlock Cantrip',
      type: 'spell_choice',
      spellFilter: {
        spellLevel: 0,
        classes: ['Warlock'],
        knownCantripOnly: true,
        modifierOnly: true,
        cantripAllowList: _eligibleCantrips(mod),
      },
      count: 1,
      level: mod.minLevel,
    });
  }

  function _slotSelectedInvocation(slotNumber) {
    if (!_charRef || !_charRef.choices) return '';
    var raw = _charRef.choices[_choicePrefix + 'warlock_invocation_' + slotNumber];
    var val = Array.isArray(raw) ? raw[0] : raw;
    return typeof val === 'string' ? val.split('|')[0].trim() : '';
  }

  _INV_LEVELS.forEach(function (threshold, i) {
    if (lv >= threshold) {
      var slotInvocations = _INV_DATA
        .filter(function(inv) {
          if (Number(threshold || 0) < Number(inv.minLevel || 1)) return false;
          if (!inv.prereq) return true;
          return _warlockHasInvocationScoped(_charRef, inv.prereq, _choicePrefix);
        })
        .map(function(inv) { return inv.name; });
      if (slotInvocations.length) {
        specs.push({
          key: 'warlock_invocation_' + (i + 1),
          label: 'Eldritch Invocation ' + (i + 1) + ' (Lv. ' + threshold + ')',
          type: 'generic_choice',
          from: slotInvocations,
          count: 1,
          level: threshold,
          // Live 2024 descriptions resolved from optionalfeatures.json (featureType
          // EI) and rendered as rich text. See ClassStep.makeOptionDescription.
          descSource: 'optionalFeature',
          featureType: 'EI',
        });
      }

      // Place the chosen invocation's cantrip selector directly under this slot,
      // instead of grouping all modifier-cantrip choices at the end of the step.
      var _slotInvocation = _slotSelectedInvocation(i + 1);
      var _slotSlug = _slotInvocation ? _slugByInvocation[_normInvocation(_slotInvocation)] : null;
      if (_slotSlug) _pushModifierCantripChoice(_slotSlug);
    }
  });

  // Pact of the Tome: 3 cantrips from any list + 2 level-1 rituals.
  if (_charRef && _warlockHasInvocationScoped(_charRef, 'Pact of the Tome', _choicePrefix)) {
    [1, 2, 3].forEach(function (n) {
      specs.push({
        key: 'warlock_tome_cantrip_' + n,
        label: 'Pact of the Tome — Cantrip ' + n + ' (any list)',
        type: 'spell_choice',
        spellFilter: { spellLevel: 0, classes: null },
        count: 1,
        level: 1
      });
    });
    [1, 2].forEach(function (n) {
      specs.push({
        key: 'warlock_tome_ritual_' + n,
        label: 'Pact of the Tome — 1st-level Ritual ' + n,
        type: 'spell_choice',
        spellFilter: { spellLevel: 1, ritual: true, classes: null },
        count: 1,
        level: 1
      });
    });
  }

  // Lessons of the First Ones: Origin feat choice.
  if (_charRef && _warlockHasInvocationScoped(_charRef, 'Lessons of the First Ones', _choicePrefix)) {
    var lessonsCount = Math.max(1, _warlockInvocationCountScoped(_charRef, 'Lessons of the First Ones', _choicePrefix));
    for (var lessonIndex = 0; lessonIndex < lessonsCount; lessonIndex += 1) {
      specs.push({
        key: 'warlock_lessons_first_ones_origin_feat_' + lessonIndex,
        label: lessonsCount > 1 ? 'Lessons of the First Ones — Origin Feat ' + (lessonIndex + 1) : 'Lessons of the First Ones — Origin Feat',
        type: 'feat_cat',
        categories: ['O'],
        source: 'Lessons of the First Ones',
        disallowDuplicates: true,
        count: 1,
        level: 2
      });
    }
  }

  if (_charRef && _warlockHasInvocationScoped(_charRef, 'Lifedrinker', _choicePrefix)) {
    specs.push({
      key: 'warlock_lifedrinker_damage_type',
      label: 'Lifedrinker — Damage Type',
      type: 'generic_choice',
      from: ['Necrotic', 'Psychic', 'Radiant'],
      count: 1,
      level: 9
    });
  }

  if (lv >= 11) specs.push({ key: 'warlock_mystic_arcanum_6', label: 'Mystic Arcanum — 6th-level Spell', type: 'spell_choice', spellFilter: { spellLevel: 6, classes: null }, count: 1, level: 11 });
  if (lv >= 13) specs.push({ key: 'warlock_mystic_arcanum_7', label: 'Mystic Arcanum — 7th-level Spell', type: 'spell_choice', spellFilter: { spellLevel: 7, classes: null }, count: 1, level: 13 });
  if (lv >= 15) specs.push({ key: 'warlock_mystic_arcanum_8', label: 'Mystic Arcanum — 8th-level Spell', type: 'spell_choice', spellFilter: { spellLevel: 8, classes: null }, count: 1, level: 15 });
  if (lv >= 17) specs.push({ key: 'warlock_mystic_arcanum_9', label: 'Mystic Arcanum — 9th-level Spell', type: 'spell_choice', spellFilter: { spellLevel: 9, classes: null }, count: 1, level: 17 });

  if (lv >= 19) {
    specs.push({ key: 'warlock_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

// [SheetRuntime] START
// Sheet action cards. Descriptions are NOT defined here: the Actions tab
// (collectAdapterActions) and the builder preview both resolve each card's body live
// by name from the class-feature / optional-feature (invocation) entries, so the text
// stays in sync with the source and never drifts. Keep only the mechanical/runtime
// fields here (cat, uses, resKey, minLevel, condition, damage formulas).
registerClassSheetActions("Warlock", [
  {
    "name": "Eldritch Invocations",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true
  },
  {
    "name": "Pact Magic",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true
  },
  {
    "name": "Magical Cunning",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "magical_cunning",
    "minLevel": 2
  },
  {
    "name": "Contact Patron",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "contact_patron",
    "minLevel": 9
  },
  {
    "name": "Mystic Arcanum",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR each",
    "minLevel": 11
  },
  {
    "name": "Eldritch Master",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "minLevel": 20
  },

  {
    "name": "Pact of the Blade",
    "icon": "swords",
    "cat": "bonus",
    "uses": "Bonus Action",
    "minLevel": 1,
    "condition": function(C) { return _warlockHasInvocation(C, 'Pact of the Blade'); }
  },
  {
    "name": "Pact of the Chain",
    "icon": "sparkles",
    "cat": "action",
    "uses": "Magic Action",
    "minLevel": 1,
    "condition": function(C) { return _warlockHasInvocation(C, 'Pact of the Chain'); }
  },
  {
    "name": "Pact of the Tome",
    "icon": "book-open",
    "cat": "action",
    "uses": "Passive / Focus",
    "passive": true,
    "minLevel": 1,
    "condition": function(C) { return _warlockHasInvocation(C, 'Pact of the Tome'); }
  },
  {
    "name": "Investment of the Chain Master",
    "icon": "sparkles",
    "cat": "bonus",
    "uses": "Bonus Action / Reaction",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Investment of the Chain Master') && _warlockHasInvocation(C, 'Pact of the Chain'); }
  },
  {
    "name": "Gift of the Protectors",
    "icon": "shield",
    "cat": "reaction",
    "uses": "1 / LR",
    "resKey": "gift_of_the_protectors",
    "minLevel": 9,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gift of the Protectors') && _warlockHasInvocation(C, 'Pact of the Tome'); }
  },

  // ── INVOCATIONS: other action types ───────────────────────────────────────

  {
    "name": "One with Shadows",
    "icon": "moon",
    "cat": "action",
    "uses": "Magic Action",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'One with Shadows'); }
  },
  {
    "name": "Gift of the Depths",
    "icon": "waves",
    "cat": "action",
    "uses": "1 / LR",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gift of the Depths'); }
  },
  {
    "name": "Gaze of Two Minds",
    "icon": "eye",
    "cat": "bonus",
    "uses": "Bonus Action",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gaze of Two Minds'); }
  },

  // ── INVOCATIONS: Pact of the Blade combat upgrades ─────────────────────────

  {
    "name": "Thirsting Blade",
    "icon": "swords",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Thirsting Blade') && _warlockHasInvocation(C, 'Pact of the Blade'); }
  },
  {
    "name": "Devouring Blade",
    "icon": "swords",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 12,
    "condition": function(C) { return _warlockHasInvocation(C, 'Devouring Blade') && _warlockHasInvocation(C, 'Thirsting Blade'); }
  },
  {
    "name": "Eldritch Smite",
    "icon": "zap",
    "cat": "action",
    "uses": "Spend a Pact Slot on hit",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Eldritch Smite') && _warlockHasInvocation(C, 'Pact of the Blade'); },
    "damageFormula": function(ctx) { var lv = Number(ctx.ownerLevel || 1); var slotLevel = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : 1; return (slotLevel + 1) + 'd8'; },
    "damageButtonLabel": function(ctx) { var lv = Number(ctx.ownerLevel || 1); var slotLevel = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : 1; return 'Smite ' + (slotLevel + 1) + 'd8 Force'; }
  },
  {
    "name": "Lifedrinker",
    "icon": "droplets",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 9,
    "condition": function(C) { return _warlockHasInvocation(C, 'Lifedrinker') && _warlockHasInvocation(C, 'Pact of the Blade'); },
    "damageFormula": "1d6",
    "damageButtonLabel": "Lifedrinker 1d6"
  }
]);
// [SheetRuntime] END

// Pact Weapon: unified via `pactWeapon` item flag. Weapon override `pact_blade` binds to it.
if (typeof registerItemFlagDef === 'function') {
  registerItemFlagDef("pactWeapon", {
    label: "Pact Weapon",
    icon: "swords",
    types: ['M', 'R'],
    maxCount: 1,
    requireClass: "Warlock",
    requireInvocation: "Pact of the Blade",
  });
}

// Sheet effects driven by Eldritch Invocations (free-form choice keys → use condition fn)
registerClassSheetEffects("Warlock", [
  { type: "sense", senseType: "truesight", value: 30,
    note: "Witch Sight",
    condition: function(C){ return _warlockHasInvocation(C, "Witch Sight"); } },
  { type: "sense", senseType: "devilsSight", value: 120,
    note: "Devil's Sight (normal vision in dim light and magical/nonmagical darkness)",
    condition: function(C){ return _warlockHasInvocation(C, "Devil's Sight"); } },
  { type: "advantage", target: "save", source: "Concentration",
    note: "Eldritch Mind",
    condition: function(C){ return _warlockHasInvocation(C, "Eldritch Mind"); } },
  { type: "speed", speedType: "swim", value: "walking",
    note: "Gift of the Depths",
    condition: function(C){ return _warlockHasInvocation(C, "Gift of the Depths"); } },
  { type: "trait", key: "underwater_breathing",
    note: "Gift of the Depths: breathe underwater",
    condition: function(C){ return _warlockHasInvocation(C, "Gift of the Depths"); } },
]);

if (typeof registerClassAtWillSpells === 'function') {
  registerClassAtWillSpells('Warlock', [
    { invocation: 'Armor of Shadows',          spell: 'Mage Armor',      minLevel: 1  },
    { invocation: 'Fiendish Vigor',            spell: 'False Life',      minLevel: 1  },
    { invocation: 'Mask of Many Faces',        spell: 'Disguise Self',   minLevel: 1  },
    { invocation: 'Misty Visions',             spell: 'Silent Image',    minLevel: 1  },
    { invocation: 'One with Shadows',          spell: 'Invisibility',   minLevel: 5  },
    { invocation: 'Otherworldly Leap',         spell: 'Jump',            minLevel: 2  },
    { invocation: 'Ascendant Step',            spell: 'Levitate',        minLevel: 5  },
    { invocation: 'Master of Myriad Forms',    spell: 'Alter Self',      minLevel: 5  },
    { invocation: 'Whispers of the Grave',     spell: 'Speak with Dead', minLevel: 7  },
    { invocation: 'Visions of Distant Realms', spell: 'Arcane Eye',      minLevel: 9  },
    { invocation: 'Pact of the Chain',         spell: 'Find Familiar',  minLevel: 1  },
  ]);
}

// Eldritch Blast invocation effects — adapter sets flags, sheet computes numeric values
if (typeof registerCantripDataModifier === 'function') {
  function _pushCantripModifierMeta(out, meta) {
    if (!meta || !meta.label) return;
    out.modifierTags = out.modifierTags || [];
    var tag = meta.tagLabel || meta.label;
    if (tag && out.modifierTags.indexOf(tag) === -1) out.modifierTags.push(tag);

    out.modifiers = Array.isArray(out.modifiers) ? out.modifiers.slice() : [];
    var key = meta.key || meta.label;
    var hasSame = out.modifiers.some(function (entry) {
      var entryKey = entry && (entry.key || entry.label || entry.tagLabel);
      return entryKey === key;
    });
    if (!hasSame) {
      out.modifiers.push({
        key: key,
        label: meta.label,
        tagLabel: meta.tagLabel || meta.label,
        detailGroupLabel: meta.detailGroupLabel || null,
        detailTitle: meta.detailTitle || meta.label,
        detailText: meta.detailText || meta.description || '',
        description: meta.description || meta.detailText || '',
      });
    }
  }

  MODIFIER_ELIGIBLE_CANTRIPS.forEach(function (cantripName) {
    registerCantripDataModifier(cantripName, function (data, C) {
      var out = Object.assign({}, data || {});
      var liveInvocation = buildOptionalFeatureEntryLookup(C && C.optionalFeatureEntries, 'EI');
      WARLOCK_MODIFIER_CANTRIP_INVOCATIONS.forEach(function (mod) {
        var effect = _MODIFIER_CANTRIP_EFFECTS[mod.slug];
        if (!effect) return;
        if (mod.minRangeFeet && _cantripRangeFeet(cantripName) < mod.minRangeFeet) return;
        if (!_warlockHasInvocation(C, mod.invocation)) return;
        if (!_warlockChoiceMatches(C, 'warlock_' + mod.slug + '_cantrip', cantripName, null)) return;
        if (effect.apply) effect.apply(out, C);
        var liveText = entriesToPlainText(liveInvocation(mod.invocation) || []);
        _pushCantripModifierMeta(out, {
          key: mod.slug.replace(/_/g, '-'),
          label: mod.invocation,
          tagLabel: mod.invocation,
          detailGroupLabel: 'Eldritch Invocations',
          detailTitle: mod.invocation,
          detailText: liveText,
          description: liveText,
        });
      });
      return out;
    });
  });
}

if (typeof registerWeaponAbilityOverride === 'function') {
  registerWeaponAbilityOverride({
    key: 'pact_blade',
    label: 'Pact Weapon',
    ability: 'cha',
    grantsProficiency: true,
    weaponTypes: ['M', 'R'],
    itemFlag: 'pactWeapon',
    condition: function (C) {
      if (!C) return false;
      const isWarlock = C.className === 'Warlock' ||
        (C.extraClasses || []).some(function (ec) { return ec.name === 'Warlock'; });
      if (!isWarlock) return false;
      return _warlockHasInvocation(C, 'Pact of the Blade');
    }
  });
}

registerClassSheetResources("Warlock", [
  {
    "key": "magical_cunning",
    "name": "Magical Cunning",
    "icon": "sparkles",
    "actionName": "Magical Cunning",
    "recharge": "LR",
    "minLevel": 2,
    "max": function() { return 1; }
  },
  {
    "key": "contact_patron",
    "name": "Contact Patron",
    "icon": "eye",
    "recharge": "LR",
    "minLevel": 9,
    "max": function() { return 1; }
  },
  {
    "key": "gift_of_the_depths",
    "name": "Gift of the Depths — Water Breathing",
    "icon": "waves",
    "recharge": "LR",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gift of the Depths'); },
    "max": function() { return 1; }
  },
  {
    "key": "gift_of_the_protectors",
    "name": "Gift of the Protectors",
    "icon": "shield",
    "recharge": "LR",
    "minLevel": 9,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gift of the Protectors') && _warlockHasInvocation(C, 'Pact of the Tome'); },
    "max": function() { return 1; }
  },
  { "key": "mystic_arcanum_6", "name": "Mystic Arcanum VI",   "icon": "sparkles", "recharge": "LR", "minLevel": 11, "max": function() { return 1; } },
  { "key": "mystic_arcanum_7", "name": "Mystic Arcanum VII",  "icon": "sparkles", "recharge": "LR", "minLevel": 13, "max": function() { return 1; } },
  { "key": "mystic_arcanum_8", "name": "Mystic Arcanum VIII", "icon": "sparkles", "recharge": "LR", "minLevel": 15, "max": function() { return 1; } },
  { "key": "mystic_arcanum_9", "name": "Mystic Arcanum IX",   "icon": "sparkles", "recharge": "LR", "minLevel": 17, "max": function() { return 1; } },
]);

// Magical Cunning: recover ceil(max Pact Magic slots / 2), or all slots at Warlock 20.
if (typeof registerResourceSideEffect === 'function') {
  registerResourceSideEffect('magical_cunning', function (ctx = {}) {
    const C = ctx.character || ctx.C;
    const slots = ctx.PACT_SLOTS || {};
    const wlv = Math.min(20, Math.max(0, _warlockLevel(C)));
    if (!wlv) return null;

    const row = slots[wlv] || {};
    const slotCount = Number(row.slots ?? row.n ?? 0);
    const slotLevel = Number(row.level ?? row.l ?? 1);
    if (!slotCount) return null;

    const recover = wlv >= 20 ? slotCount : Math.ceil(slotCount / 2);
    return {
      type: 'recover_pact_slots',
      recover,
      slotLevel,
      label: wlv >= 20 ? 'Eldritch Master' : 'Magical Cunning',
    };
  });
}

if (typeof registerClassRuntimeConfig === 'function') {
  const existingRuntimeConfig = typeof getClassRuntimeConfig === 'function' ? (getClassRuntimeConfig('Warlock') || {}) : {};
  const existingSpellcasting = existingRuntimeConfig.spellcasting || {};
  const warlockCantripKnown = existingSpellcasting.cantripKnown || [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
  const warlockPreparedSpells = existingSpellcasting.preparedSpellsProgression || existingSpellcasting.spellsKnown || [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15];

  registerClassRuntimeConfig('Warlock', {
    ...existingRuntimeConfig,
    multiclassPrerequisites: [{ cha: 13 }],
    spellcasting: {
      ...existingSpellcasting,
      ability: 'cha',
      casterProgression: 'pact',
      preparedMode: 'prepared',
      cantripKnown: warlockCantripKnown,
      preparedSpellsProgression: warlockPreparedSpells,
      alwaysPreparedSpells: [
        { name: 'Contact Other Plane', minLevel: 9, level: 5, source: 'Contact Patron', sourceType: 'class' },
      ],
      alwaysKnownSpells: [
        { name: 'Find Familiar', minLevel: 1, level: 1, source: 'Pact of the Chain', sourceType: 'class', invocation: 'Pact of the Chain' },
        { name: 'Water Breathing', minLevel: 5, level: 3, source: 'Gift of the Depths', sourceType: 'class', invocation: 'Gift of the Depths' },
      ],
      choiceSpellSources: {
        ...(existingSpellcasting.choiceSpellSources || {}),
        warlock_tome_cantrip_1: { label: 'Pact of the Tome', ability: 'cha' },
        warlock_tome_cantrip_2: { label: 'Pact of the Tome', ability: 'cha' },
        warlock_tome_cantrip_3: { label: 'Pact of the Tome', ability: 'cha' },
        warlock_tome_ritual_1: { label: 'Pact of the Tome', ability: 'cha' },
        warlock_tome_ritual_2: { label: 'Pact of the Tome', ability: 'cha' },
        warlock_mystic_arcanum_6: { label: 'Mystic Arcanum VI', ability: 'cha' },
        warlock_mystic_arcanum_7: { label: 'Mystic Arcanum VII', ability: 'cha' },
        warlock_mystic_arcanum_8: { label: 'Mystic Arcanum VIII', ability: 'cha' },
        warlock_mystic_arcanum_9: { label: 'Mystic Arcanum IX', ability: 'cha' },
      },
    },
  });
}

// Register choice-to-level mappings for the builder's choice cleanup system.
// XPHB 2024: invocation slots 1..10 unlock at warlock levels [1,2,2,5,5,7,9,12,15,18].
(function registerWarlockChoiceLevels() {
  var invLevels = [1, 2, 2, 5, 5, 7, 9, 12, 15, 18];
  registerChoiceLevelMap({
    source: 'Warlock: invocations',
    test: function(key) { var m = String(key).match(/^warlock_invocation_(\d+)$/); return m ? Number(m[1]) : null; },
    level: function(slotIdx) { return invLevels[slotIdx - 1] || 99; },
  });
  registerChoiceLevelMap({
    source: 'Warlock: mystic arcanum',
    test: function(key) { var m = String(key).match(/^warlock_mystic_arcanum_(\d+)$/); return m ? Number(m[1]) : null; },
    level: function(spellLv) { return spellLv <= 6 ? 11 : spellLv <= 7 ? 13 : spellLv <= 8 ? 15 : 17; },
  });
  registerChoiceLevelMap({
    source: 'Warlock: lessons origin feats',
    test: function(key) {
      return /^warlock_lessons_first_ones_origin_feat_(\d+)$/i.test(String(key || '')) ? 1 : null;
    },
    level: function() { return 2; },
  });
})();

}
