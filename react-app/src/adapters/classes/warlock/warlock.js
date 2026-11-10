import { createAdapterBindings } from '../../adapterBindings.js';
import {
  warlockHasInvocation,
  warlockInvocationCount,
  warlockLevel,
  WARLOCK_MODIFIER_CANTRIP_INVOCATIONS,
  warlockModifierCantripChoiceKey,
} from '../../../shared/character/progression/warlockUtils.js';
import { registerChoiceLevelMap } from '../../../shared/character/progression/choiceLevels.js';
import {
  buildOptionalFeatureEntryLookup,
  optionalFeatureOptions,
} from '../../../shared/character/progression/optionalFeatures.js';
import { entriesToPlainText } from '../../../shared/content/entryText.js';
import { matchKey, stripSource } from '../../../shared/content/nameKeys.js';
import { pactSlots } from '../../../shared/character/spells/casterProgression.js';
import {
  REPEATABLE_INVOCATIONS, INVOCATION_SLOT_LEVELS, MODIFIER_CANTRIP_EFFECTS, MODIFIER_ELIGIBLE_CANTRIPS, warlockChoiceMatches,
} from './invocations.js';
import { clamp } from '../../../shared/numbers.js';
import { finalAbilityModifier } from '../../../shared/character/progression/abilityScores.js';

export default function install(registry, context = {}) {
  const {
    registerClassAdapter,
    registerClassSheetActions,
    registerClassSheetResources,
    registerClassSheetEffects,
    registerClassSheetChoiceMeta,
    registerItemFlagDef,
    registerWeaponAbilityOverride,
    registerClassAtWillSpells,
    registerResourceSideEffect,
    getCantripData,
    registerCantripDataModifier,
    registerFeatOwnerKeyPattern,
  } = createAdapterBindings(registry, context);

registerFeatOwnerKeyPattern(/^(?:mc\d+_)?warlock_lessons(?:_first_ones_origin)?_feat(?:_\d+)?$/i);

// The invocations themselves (names, levels, prerequisites) come from the
// optional-feature data (featureType EI); what it does not say: which ones can
// be taken more than once.
registerClassSheetChoiceMeta("Warlock", {
  repeatableInvocations: REPEATABLE_INVOCATIONS,
});

function _warlockAdapterCharacter(localContext) {
  return (localContext && (localContext.character || localContext.char || localContext.C || localContext.activeCharacter))
    || context.character
    || context.char
    || context.C
    || context.activeCharacter
    || null;
}

// Cantrip range in feet from registered cantrip data; 0 for Touch/Self/unknown.
function _cantripRangeFeet(name) {
  var data = getCantripData(name);
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

registerClassAdapter("Warlock", function (cls, lv, specs, adapterContext = {}) {
  var _charRef = _warlockAdapterCharacter(adapterContext);
  var _choicePrefix = String(adapterContext?.keyPrefix || '');

  // Modifier-cantrip invocations (Agonizing/Repelling Blast, Eldritch Spear) attach a
  // cantrip choice. It is rendered directly under the invocation slot that selected it
  // (interleaved in the loop below) rather than grouped at the end. Precompute the total
  // occurrences so repeated picks get suffixed keys; `seen` advances as slots are walked.
  var _modCantripBySlug = {};
  var _slugByInvocation = {};
  WARLOCK_MODIFIER_CANTRIP_INVOCATIONS.forEach(function (mod) {
    _modCantripBySlug[mod.slug] = {
      mod: mod,
      total: Math.max(1, warlockInvocationCount(_charRef, mod.invocation, _choicePrefix)),
      seen: 0,
    };
    _slugByInvocation[matchKey(mod.invocation)] = mod.slug;
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
    return typeof val === 'string' ? stripSource(val) : '';
  }

  INVOCATION_SLOT_LEVELS.forEach(function (threshold, i) {
    if (lv >= threshold) {
      var slotInvocations = optionalFeatureOptions(adapterContext.optionalFeatures, 'EI')
        .filter(function(inv) {
          if (Number(threshold || 0) < Number(inv.minLevel || 1)) return false;
          return inv.prereqs.every(function (prereq) { return warlockHasInvocation(_charRef, prereq, _choicePrefix); });
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
      var _slotSlug = _slotInvocation ? _slugByInvocation[matchKey(_slotInvocation)] : null;
      if (_slotSlug) _pushModifierCantripChoice(_slotSlug);
    }
  });

  // Pact of the Tome: 3 cantrips from any list + 2 level-1 rituals.
  if (_charRef && warlockHasInvocation(_charRef, 'Pact of the Tome', _choicePrefix)) {
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
  if (_charRef && warlockHasInvocation(_charRef, 'Lessons of the First Ones', _choicePrefix)) {
    var lessonsCount = Math.max(1, warlockInvocationCount(_charRef, 'Lessons of the First Ones', _choicePrefix));
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

  if (_charRef && warlockHasInvocation(_charRef, 'Lifedrinker', _choicePrefix)) {
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

// Sheet action cards. Descriptions are NOT defined here: the Actions tab
// (collectAdapterActions) and the builder preview both resolve each card's body live
// by name from the class-feature / optional-feature (invocation) entries, so the text
// stays in sync with the source and never drifts. Keep only the mechanical/runtime
// fields here (cat, uses, resKey, minLevel, condition, damage formulas).
registerClassSheetActions("Warlock", [
  {
    "name": "Magical Cunning",
    "cat": "action",
    "resKey": "magical_cunning",
    "minLevel": 2
  },
  {
    "name": "Contact Patron",
    "cat": "action",
    "resKey": "contact_patron",
    "minLevel": 9
  },
  {
    "name": "Mystic Arcanum",
    "cat": "action",
    "minLevel": 11
  },
  {
    "name": "Eldritch Master",
    "cat": "action",
    "minLevel": 20
  },

  {
    "name": "Pact of the Blade",
    "cat": "bonus",
    "minLevel": 1,
    "condition": function(C) { return warlockHasInvocation(C, 'Pact of the Blade'); }
  },
  {
    "name": "Pact of the Chain",
    "cat": "action",
    "minLevel": 1,
    "condition": function(C) { return warlockHasInvocation(C, 'Pact of the Chain'); }
  },
  {
    "name": "Investment of the Chain Master",
    "cat": "bonus",
    "minLevel": 5,
    "condition": function(C) { return warlockHasInvocation(C, 'Investment of the Chain Master') && warlockHasInvocation(C, 'Pact of the Chain'); }
  },
  {
    "name": "Gift of the Protectors",
    "cat": "reaction",
    "resKey": "gift_of_the_protectors",
    "minLevel": 9,
    "condition": function(C) { return warlockHasInvocation(C, 'Gift of the Protectors') && warlockHasInvocation(C, 'Pact of the Tome'); }
  },

  // ── INVOCATIONS: other action types ───────────────────────────────────────

  {
    "name": "One with Shadows",
    "cat": "action",
    "minLevel": 5,
    "condition": function(C) { return warlockHasInvocation(C, 'One with Shadows'); }
  },
  {
    "name": "Gift of the Depths",
    "cat": "action",
    "minLevel": 5,
    "condition": function(C) { return warlockHasInvocation(C, 'Gift of the Depths'); }
  },
  {
    "name": "Gaze of Two Minds",
    "cat": "bonus",
    "minLevel": 5,
    "condition": function(C) { return warlockHasInvocation(C, 'Gaze of Two Minds'); }
  },

  {
    "name": "Eldritch Smite",
    "cat": "action",
    "minLevel": 5,
    "condition": function(C) { return warlockHasInvocation(C, 'Eldritch Smite') && warlockHasInvocation(C, 'Pact of the Blade'); },
    rollers: [{ kind: 'damage', formula: function(ctx) { var lv = Number(ctx.ownerLevel || 1); var slotLevel = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : 1; return (slotLevel + 1) + 'd8'; }, label: function(ctx) { var lv = Number(ctx.ownerLevel || 1); var slotLevel = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : 1; return 'Smite ' + (slotLevel + 1) + 'd8 Force'; } }],},

  // ── INVOCATIONS: World of Warcraft (demonology) ───────────────────────────

  {
    "name": "Pact of the Legion",
    "cat": "action",
    "minLevel": 1,
    "condition": function(C) { return warlockHasInvocation(C, 'Pact of the Legion'); }
  },
  {
    "name": "Call of the Void",
    "cat": "bonus",
    "minLevel": 5,
    "condition": function(C) { return warlockHasInvocation(C, 'Call of the Void') && warlockHasInvocation(C, 'Pact of the Legion'); }
  },
  {
    "name": "Health Funnel",
    "cat": "bonus",
    "minLevel": 2,
    "condition": function(C) { return warlockHasInvocation(C, 'Health Funnel'); },
    inlinePills: function(ctx) { return [{ label: 'Per Hit Point Die', value: '+' + finalAbilityModifier(ctx.character, 'cha') }]; }
  },
  {
    "name": "Curse of Corruption",
    "cat": "special",
    "minLevel": 2,
    "condition": function(C) { return warlockHasInvocation(C, 'Curse of Corruption'); },
    inlinePills: function(ctx) { return [{ label: 'Necrotic', value: finalAbilityModifier(ctx.character, 'cha') }]; }
  },
  {
    "name": "Expendable Minions",
    "cat": "special",
    "minLevel": 9,
    "condition": function(C) { return warlockHasInvocation(C, 'Expendable Minions'); },
    inlinePills: function(ctx) { return [{ label: 'Healing', value: Number(ctx.ownerLevel || 0) + finalAbilityModifier(ctx.character, 'cha') }]; }
  },
  {
    "name": "Legion Summoning",
    "cat": "action",
    "resKey": "legion_summoning",
    "minLevel": 9,
    "condition": function(C) { return warlockHasInvocation(C, 'Legion Summoning') && warlockHasInvocation(C, 'Pact of the Legion'); }
  }
]);

// Pact Weapon: unified via `pactWeapon` item flag. Weapon override `pact_blade` binds to it.
registerItemFlagDef("pactWeapon", {
  label: "Pact Weapon",
  activeLabel: "Pact",
  tone: "#9d7fb8",
  types: ['M', 'R', 'WEAPON'],
  maxCount: 1,
  requireClass: "Warlock",
  requireInvocation: "Pact of the Blade",
});

// Sheet effects driven by Eldritch Invocations (free-form choice keys → use condition fn)
registerClassSheetEffects("Warlock", [
  { type: "sense", senseType: "truesight", value: 30,
    note: "Witch Sight",
    condition: function(C){ return warlockHasInvocation(C, "Witch Sight"); } },
  { type: "sense", senseType: "devilsSight", value: 120,
    note: "Devil's Sight (normal vision in dim light and magical/nonmagical darkness)",
    condition: function(C){ return warlockHasInvocation(C, "Devil's Sight"); } },
  { type: "advantage", target: "save", source: "Concentration",
    note: "Eldritch Mind",
    condition: function(C){ return warlockHasInvocation(C, "Eldritch Mind"); } },
  { type: "speed", speedType: "swim", value: "walking",
    note: "Gift of the Depths",
    condition: function(C){ return warlockHasInvocation(C, "Gift of the Depths"); } },
  { type: "trait", key: "underwater_breathing",
    note: "Gift of the Depths: breathe underwater",
    condition: function(C){ return warlockHasInvocation(C, "Gift of the Depths"); } },
]);

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
  { invocation: 'Pact of the Legion',        spell: 'Find Familiar',  minLevel: 1  },
]);

// Eldritch Blast invocation effects — adapter sets flags, sheet computes numeric values
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
      var effect = MODIFIER_CANTRIP_EFFECTS[mod.slug];
      if (!effect) return;
      if (mod.minRangeFeet && _cantripRangeFeet(cantripName) < mod.minRangeFeet) return;
      if (!warlockHasInvocation(C, mod.invocation)) return;
      if (!warlockChoiceMatches(C, 'warlock_' + mod.slug + '_cantrip', cantripName, null)) return;
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
    return warlockHasInvocation(C, 'Pact of the Blade');
  }
});

registerClassSheetResources("Warlock", [
  {
    "key": "magical_cunning",
    "name": "Magical Cunning",
    "actionName": "Magical Cunning",
    "recharge": "LR",
    "minLevel": 2,
    "max": function() { return 1; }
  },
  {
    "key": "contact_patron",
    "name": "Contact Patron",
    "recharge": "LR",
    "minLevel": 9,
    "max": function() { return 1; }
  },
  {
    "key": "gift_of_the_depths",
    "name": "Gift of the Depths — Water Breathing",
    "recharge": "LR",
    "minLevel": 5,
    "condition": function(C) { return warlockHasInvocation(C, 'Gift of the Depths'); },
    "max": function() { return 1; }
  },
  {
    "key": "legion_summoning",
    "name": "Legion Summoning",
    "recharge": "LR",
    "minLevel": 9,
    "condition": function(C) { return warlockHasInvocation(C, 'Legion Summoning') && warlockHasInvocation(C, 'Pact of the Legion'); },
    "max": function() { return 1; }
  },
  {
    "key": "gift_of_the_protectors",
    "name": "Gift of the Protectors",
    "recharge": "LR",
    "minLevel": 9,
    "condition": function(C) { return warlockHasInvocation(C, 'Gift of the Protectors') && warlockHasInvocation(C, 'Pact of the Tome'); },
    "max": function() { return 1; }
  },
  { "key": "mystic_arcanum_6", "name": "Mystic Arcanum VI",   "recharge": "LR", "minLevel": 11, "max": function() { return 1; } },
  { "key": "mystic_arcanum_7", "name": "Mystic Arcanum VII",  "recharge": "LR", "minLevel": 13, "max": function() { return 1; } },
  { "key": "mystic_arcanum_8", "name": "Mystic Arcanum VIII", "recharge": "LR", "minLevel": 15, "max": function() { return 1; } },
  { "key": "mystic_arcanum_9", "name": "Mystic Arcanum IX",   "recharge": "LR", "minLevel": 17, "max": function() { return 1; } },
]);

// Magical Cunning: recover ceil(max Pact Magic slots / 2), or all slots at Warlock 20.
registerResourceSideEffect('magical_cunning', function (ctx = {}) {
  const C = ctx.character;
  const wlv = clamp(warlockLevel(C), 0, 20);
  if (!wlv) return null;

  const { count: slotCount, level: slotLevel } = pactSlots(wlv);
  if (!slotCount) return null;

  const recover = wlv >= 20 ? slotCount : Math.ceil(slotCount / 2);
  return {
    type: 'recover_pact_slots',
    recover,
    slotLevel,
    label: wlv >= 20 ? 'Eldritch Master' : 'Magical Cunning',
    recoverResourceKeys: wlv >= 6 && Object.prototype.hasOwnProperty.call(ctx.resources || {}, 'vestige_power')
      ? ['vestige_power']
      : [],
  };
});

// Register choice-to-level mappings for the builder's choice cleanup system.
(function registerWarlockChoiceLevels() {
  registerChoiceLevelMap({
    source: 'Warlock: invocations',
    test: function(key) { var m = String(key).match(/^warlock_invocation_(\d+)$/); return m ? Number(m[1]) : null; },
    level: function(slotIdx) { return INVOCATION_SLOT_LEVELS[slotIdx - 1] || 99; },
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
