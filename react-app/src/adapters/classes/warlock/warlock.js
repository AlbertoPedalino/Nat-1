import { createAdapterBindings } from '../../adapterBindings.js';
import { warlockHasInvocation, warlockLevel, warlockKnownInvocations, warlockInvocationSelections } from '../../../shared/character/warlockUtils.js';
import { registerChoiceLevelMap } from '../../../shared/character/choiceLevels.js';

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

// Eldritch Invocations XPHB 2024 — name, minLevel, prereqInvocation, description
const _INV_DATA = [
  { name: 'Agonizing Blast', minLevel: 2, prereq: null,
    desc: 'Choose one of your known Warlock cantrips that deals damage. You can add your Charisma modifier to that spell\'s damage rolls.' },
  { name: 'Armor of Shadows', minLevel: 2, prereq: null,
    desc: 'You can cast Mage Armor on yourself at will, without expending a spell slot.' },
  { name: 'Ascendant Step', minLevel: 5, prereq: null,
    desc: 'Prerequisite: Warlock 5\n\nYou can cast Levitate on yourself without expending a spell slot.' },
  { name: 'Devil\'s Sight', minLevel: 1, prereq: null,
    desc: 'You can see normally in Darkness—both magical and nonmagical—to a distance of 120 feet.' },
  { name: 'Devouring Blade', minLevel: 12, prereq: 'Thirsting Blade',
    desc: 'Prerequisite: Warlock 12, Thirsting Blade\n\nThe Extra Attack of your Thirsting Blade invocation confers two Extra Attacks rather than one. Once per turn when you hit a creature with your pact weapon, you can move up to 10 feet toward a different creature without provoking Opportunity Attacks.' },
  { name: 'Eldritch Mind', minLevel: 1, prereq: null,
    desc: 'You have Advantage on Constitution saving throws that you make to maintain Concentration.' },
  { name: 'Eldritch Smite', minLevel: 5, prereq: 'Pact of the Blade',
    desc: 'Prerequisite: Warlock 5, Pact of the Blade\n\nOnce per turn when you hit a creature with your pact weapon, you can expend a Pact Magic spell slot to deal an extra 1d8 Force damage to the target, plus another 1d8 per level of the slot, and you can give the target the Prone condition if it is Huge or smaller.' },
  { name: 'Eldritch Spear', minLevel: 2, prereq: null,
    desc: 'Choose one of your known Warlock cantrips that deals damage and has a range of 10 feet or greater. When you cast that spell, its range increases by a number of feet equal to 30 times your Warlock level.' },
  { name: 'Fiendish Vigor', minLevel: 2, prereq: null,
    desc: 'You can cast False Life on yourself at will, without expending a spell slot. When you cast it this way, you automatically get the highest number of Temporary Hit Points possible from the spell.' },
  { name: 'Gaze of Two Minds', minLevel: 5, prereq: null,
    desc: 'Prerequisite: Warlock 5\n\nYou can use a Bonus Action to touch a willing creature and perceive through its senses until the end of your next turn. As long as the creature is on the same plane of existence as you, you can use your action on subsequent turns to maintain this connection. While perceiving through the other creature\'s senses, you benefit from any special senses possessed by that creature, and you are Blinded and Deafened with regard to your own surroundings.' },
  { name: 'Gift of the Depths', minLevel: 5, prereq: null,
    desc: 'Prerequisite: Warlock 5\n\nYou can breathe underwater, and you have a Swim Speed equal to your Speed. You can also cast Water Breathing once without expending a spell slot. You regain the ability to cast it this way when you finish a Long Rest.' },
  { name: 'Gift of the Protectors', minLevel: 9, prereq: 'Pact of the Tome',
    desc: 'Prerequisite: Warlock 9, Pact of the Tome\n\nA new page appears in your Book of Shadows. With your permission, a creature can use its action to write its name on that page, which can contain a number of names equal to your Proficiency Bonus. When any creature whose name is on the page is reduced to 0 Hit Points but not killed outright, the creature magically drops to 1 Hit Point instead. Once this magic is triggered, no creature can benefit from it until you finish a Long Rest.' },
  { name: 'Investment of the Chain Master', minLevel: 5, prereq: 'Pact of the Chain',
    desc: 'Prerequisite: Warlock 5, Pact of the Chain\n\nWhen you cast Find Familiar, you infuse the summoned familiar with eldritch power, granting it: Fly or Swim Speed 40 ft; you can command it to Attack as a Bonus Action; its attacks are magical; it uses your spell save DC; when it takes damage you can use your Reaction to grant it Resistance.' },
  { name: 'Lessons of the First Ones', minLevel: 2, prereq: null,
    desc: 'You have received knowledge from an elder entity of the multiverse, granting you the ability to take one Origin feat of your choice. This invocation can be taken more than once.' },
  { name: 'Lifedrinker', minLevel: 9, prereq: 'Pact of the Blade',
    desc: 'Prerequisite: Warlock 9, Pact of the Blade\n\nOnce per turn when you hit a creature with your pact weapon, you can deal an extra 1d6 Necrotic, Psychic, or Radiant damage (your choice when you take this invocation) to the creature, and you can expend one of your Hit Point Dice to roll it and regain a number of Hit Points equal to the roll plus your Constitution modifier (minimum 1).' },
  { name: 'Mask of Many Faces', minLevel: 2, prereq: null,
    desc: 'You can cast Disguise Self at will, without expending a spell slot.' },
  { name: 'Master of Myriad Forms', minLevel: 5, prereq: null,
    desc: 'Prerequisite: Warlock 5\n\nYou can cast Alter Self at will, without expending a spell slot.' },
  { name: 'Misty Visions', minLevel: 2, prereq: null,
    desc: 'You can cast Silent Image at will, without expending a spell slot.' },
  { name: 'One with Shadows', minLevel: 5, prereq: null,
    desc: 'Prerequisite: Warlock 5\n\nWhile you are in an area of Dim Light or Darkness, you can use a Magic action to give yourself the Invisible condition until you move or take an action, a Bonus Action, or a Reaction.' },
  { name: 'Otherworldly Leap', minLevel: 2, prereq: null,
    desc: 'Prerequisite: Warlock 2\n\nYou can cast Jump on yourself without expending a spell slot.' },
  { name: 'Pact of the Blade', minLevel: 1, prereq: null,
    desc: 'As a Bonus Action, you can conjure a pact weapon in your hand—a Simple or Martial weapon of your choice—or create a bond with a magic weapon you touch. Until the bond ends, you have proficiency with the weapon, and you can use it as a spellcasting focus. Whenever you attack with the bonded weapon, you can use your Charisma modifier for attack and damage rolls and cause it to deal Necrotic, Psychic, or Radiant damage.' },
  { name: 'Pact of the Chain', minLevel: 1, prereq: null,
    desc: 'You learn the Find Familiar spell and can cast it as a Magic action without expending a spell slot. You can communicate telepathically with your familiar and perceive through its senses. When you take the Attack action, you can forgo one of your attacks to allow your familiar to make one attack with its Reaction.' },
  { name: 'Pact of the Tome', minLevel: 1, prereq: null,
    desc: 'Your Book of Shadows functions as a spellcasting focus for your Warlock spells. The book holds 3 cantrips from any class\'s spell list and two 1st-level ritual spells from any class\'s spell list.' },
  { name: 'Repelling Blast', minLevel: 2, prereq: null,
    desc: 'Choose one of your known Warlock cantrips that deals damage. When you hit a creature with that spell, you can push the creature up to 10 feet straight away from you.' },
  { name: 'Thirsting Blade', minLevel: 5, prereq: 'Pact of the Blade',
    desc: 'Prerequisite: Warlock 5, Pact of the Blade\n\nYou gain the Extra Attack feature for your pact weapon only. With that feature, you can attack twice with the pact weapon instead of once when you take the Attack action on your turn.' },
  { name: 'Visions of Distant Realms', minLevel: 15, prereq: null,
    desc: 'Prerequisite: Warlock 15\n\nYou can cast Arcane Eye at will, without expending a spell slot.' },
  { name: 'Whispers of the Grave', minLevel: 7, prereq: null,
    desc: 'Prerequisite: Warlock 7\n\nYou can cast Speak with Dead at will, without expending a spell slot.' },
  { name: 'Witch Sight', minLevel: 15, prereq: null,
    desc: 'Prerequisite: Warlock 15\n\nYou have Truesight with a range of 30 feet.' },
];

// Quick lookup: name → description
const _INV_DESCS = {};
_INV_DATA.forEach(function(inv) { _INV_DESCS[inv.name] = inv.desc; });
registerClassSheetChoiceMeta("Warlock", {
  invocationData: _INV_DATA.map(function (inv) {
    return {
      name: inv.name,
      minLevel: inv.minLevel,
      prereq: inv.prereq || null,
      source: inv.source || 'XPHB',
      repeatable: !!inv.repeatable || /more than once/i.test(String(inv.desc || '')),
      desc: inv.desc || '',
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

registerClassAdapter("Warlock", function (cls, lv, specs, adapterContext = {}) {
  var _charRef = _warlockAdapterCharacter(adapterContext);
  var _choicePrefix = String(adapterContext?.keyPrefix || '');

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
          descMap: _INV_DESCS
        });
      }
    }
  });

  if (_charRef && _warlockHasInvocationScoped(_charRef, 'Agonizing Blast', _choicePrefix)) {
    var agonizingCount = Math.max(1, _warlockInvocationCountScoped(_charRef, 'Agonizing Blast', _choicePrefix));
    for (var agonizingIndex = 1; agonizingIndex <= agonizingCount; agonizingIndex += 1) {
      specs.push({
        key: agonizingCount > 1 ? 'warlock_agonizing_blast_cantrip_' + agonizingIndex : 'warlock_agonizing_blast_cantrip',
        label: agonizingCount > 1 ? 'Agonizing Blast — Warlock Cantrip ' + agonizingIndex : 'Agonizing Blast — Warlock Cantrip',
        type: 'spell_choice',
        spellFilter: { spellLevel: 0, classes: ['Warlock'], knownCantripOnly: true, modifierOnly: true },
        count: 1,
        level: 2
      });
    }
  }

  if (_charRef && _warlockHasInvocationScoped(_charRef, 'Repelling Blast', _choicePrefix)) {
    var repellingCount = Math.max(1, _warlockInvocationCountScoped(_charRef, 'Repelling Blast', _choicePrefix));
    for (var repellingIndex = 1; repellingIndex <= repellingCount; repellingIndex += 1) {
      specs.push({
        key: repellingCount > 1 ? 'warlock_repelling_blast_cantrip_' + repellingIndex : 'warlock_repelling_blast_cantrip',
        label: repellingCount > 1 ? 'Repelling Blast — Warlock Cantrip ' + repellingIndex : 'Repelling Blast — Warlock Cantrip',
        type: 'spell_choice',
        spellFilter: { spellLevel: 0, classes: ['Warlock'], knownCantripOnly: true, modifierOnly: true },
        count: 1,
        level: 2
      });
    }
  }

  if (_charRef && _warlockHasInvocationScoped(_charRef, 'Eldritch Spear', _choicePrefix)) {
    var spearCount = Math.max(1, _warlockInvocationCountScoped(_charRef, 'Eldritch Spear', _choicePrefix));
    for (var spearIndex = 1; spearIndex <= spearCount; spearIndex += 1) {
      specs.push({
        key: spearCount > 1 ? 'warlock_eldritch_spear_cantrip_' + spearIndex : 'warlock_eldritch_spear_cantrip',
        label: spearCount > 1 ? 'Eldritch Spear — Warlock Cantrip ' + spearIndex : 'Eldritch Spear — Warlock Cantrip',
        type: 'spell_choice',
        spellFilter: { spellLevel: 0, classes: ['Warlock'], knownCantripOnly: true, modifierOnly: true },
        count: 1,
        level: 2
      });
    }
  }

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
registerClassSheetActions("Warlock", [
  {
    "name": "Eldritch Invocations",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "desc": "Learn 1 invocation at lv.1 (more at odd levels). Key passive options: Agonizing Blast (add CHA to EB damage), Devil's Sight (see 120 ft in magical darkness), Eldritch Mind (Adv. on Concentration), Eldritch Spear (EB range 300 ft), Repelling Blast (push 10 ft), Witch Sight (see true forms)."
  },
  {
    "name": "Pact Magic",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "desc": "Your spell slots recharge on a Short Rest or Long Rest. All your slots are the same level (lv.1–5, scales with Warlock level). You learn a limited number of spells from the Warlock list."
  },
  {
    "name": "Magical Cunning",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "magical_cunning",
    "minLevel": 2,
    "desc": "Perform esoteric rite for 1 minute. At end, regain expended Pact Magic slots up to half your maximum (round up). Once used, unavailable until Long Rest."
  },
  {
    "name": "Contact Patron",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "contact_patron",
    "minLevel": 9,
    "desc": "You always have Contact Other Plane prepared. When you cast it, you automatically succeed on the saving throw and contact your patron (not a random planar entity). Recharge: Long Rest."
  },
  {
    "name": "Mystic Arcanum",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR each",
    "minLevel": 11,
    "desc": "A 6th-level spell known without a slot, usable once per LR (lv.11). Gain a 7th-level spell at lv.13, 8th at lv.15, 9th at lv.17. Recharge: Long Rest for each."
  },
  {
    "name": "Eldritch Master",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "minLevel": 20,
    "desc": "Magical Cunning is upgraded: when you use its 1-minute ritual, you regain ALL expended Pact Magic slots (instead of half). Once per Long Rest."
  },

  {
    "name": "Pact of the Blade",
    "icon": "swords",
    "cat": "bonus",
    "uses": "Bonus Action",
    "minLevel": 1,
    "condition": function(C) { return _warlockHasInvocation(C, 'Pact of the Blade'); },
    "desc": "Conjure a Simple or Martial pact weapon, or bond with a magic weapon you touch. You are proficient with it, can use it as a spellcasting focus, and can use CHA for attack and damage rolls. Use the Inventory tab to mark one equipped weapon as Pact Weapon."
  },
  {
    "name": "Pact of the Chain",
    "icon": "sparkles",
    "cat": "action",
    "uses": "Magic Action",
    "minLevel": 1,
    "condition": function(C) { return _warlockHasInvocation(C, 'Pact of the Chain'); },
    "desc": "You have Find Familiar available through the pact. You can cast it as a Magic action without expending a spell slot. Investment of the Chain Master unlocks additional familiar benefits."
  },
  {
    "name": "Pact of the Tome",
    "icon": "book-open",
    "cat": "action",
    "uses": "Passive / Focus",
    "minLevel": 1,
    "condition": function(C) { return _warlockHasInvocation(C, 'Pact of the Tome'); },
    "desc": "Your Book of Shadows functions as a spellcasting focus for your Warlock spells and grants three cantrips plus two 1st-level rituals from any spell list."
  },
  {
    "name": "Investment of the Chain Master",
    "icon": "sparkles",
    "cat": "bonus",
    "uses": "Bonus Action / Reaction",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Investment of the Chain Master') && _warlockHasInvocation(C, 'Pact of the Chain'); },
    "desc": "Your familiar gains Fly or Swim Speed 40 ft. You can command it to Attack as a Bonus Action. Its B/P/S damage can become Necrotic or Radiant, it uses your spell save DC, and you can use your Reaction to grant it Resistance to damage."
  },
  {
    "name": "Gift of the Protectors",
    "icon": "shield",
    "cat": "reaction",
    "uses": "1 / LR",
    "resKey": "gift_of_the_protectors",
    "minLevel": 9,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gift of the Protectors') && _warlockHasInvocation(C, 'Pact of the Tome'); },
    "desc": "When a creature named in your Book of Shadows is reduced to 0 HP but not killed outright, it drops to 1 HP instead. The page can hold names equal to your CHA modifier (minimum 1). Recharge: Long Rest."
  },

  // ── INVOCATIONS: other action types ───────────────────────────────────────

  {
    "name": "One with Shadows",
    "icon": "moon",
    "cat": "action",
    "uses": "Magic Action",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'One with Shadows'); },
    "desc": "While in Dim Light or Darkness, use the Magic action to become Invisible until you move, take an action, reaction, or bonus action — or until the light level changes."
  },
  {
    "name": "Gift of the Depths",
    "icon": "waves",
    "cat": "action",
    "uses": "1 / LR",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gift of the Depths'); },
    "desc": "Passive: swim speed = walking speed, breathe underwater. Once per Long Rest, cast Water Breathing without a slot (up to 10 willing creatures, 24 hours)."
  },
  {
    "name": "Gaze of Two Minds",
    "icon": "eye",
    "cat": "bonus",
    "uses": "Bonus Action",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Gaze of Two Minds'); },
    "desc": "Bonus Action: touch a willing creature to perceive through its senses for 1 hour. You can perceive through it simultaneously and use its position for spells. Each new use ends the previous one."
  },

  // ── INVOCATIONS: Pact of the Blade combat upgrades ─────────────────────────

  {
    "name": "Thirsting Blade",
    "icon": "swords",
    "cat": "attack",
    "uses": "Passive",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Thirsting Blade') && _warlockHasInvocation(C, 'Pact of the Blade'); },
    "desc": "Extra Attack: when you take the Attack action, you attack twice instead of once with your Pact Weapon. Requires Pact of the Blade."
  },
  {
    "name": "Devouring Blade",
    "icon": "swords",
    "cat": "attack",
    "uses": "Passive",
    "minLevel": 12,
    "condition": function(C) { return _warlockHasInvocation(C, 'Devouring Blade') && _warlockHasInvocation(C, 'Thirsting Blade'); },
    "desc": "Your second Pact Weapon attack (from Thirsting Blade) can target a different creature within 5 ft of the first target. Requires Thirsting Blade."
  },
  {
    "name": "Eldritch Smite",
    "icon": "zap",
    "cat": "action",
    "uses": "Spend a Pact Slot on hit",
    "minLevel": 5,
    "condition": function(C) { return _warlockHasInvocation(C, 'Eldritch Smite') && _warlockHasInvocation(C, 'Pact of the Blade'); },
    "damageFormula": function(ctx) { var lv = Number(ctx.ownerLevel || 1); var slotLevel = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : 1; return (slotLevel + 1) + 'd8'; },
    "damageButtonLabel": function(ctx) { var lv = Number(ctx.ownerLevel || 1); var slotLevel = lv >= 9 ? 5 : lv >= 7 ? 4 : lv >= 5 ? 3 : 1; return 'Smite ' + (slotLevel + 1) + 'd8 Force'; },
    "desc": "Once per turn when you hit a creature with your Pact Weapon, you can expend one Pact Magic slot to deal extra Force damage (1d8 per slot level) and knock the target Prone (STR save, Huge or smaller only). Spend the Pact Slot manually in the Spells tab. Requires Pact of the Blade."
  },
  {
    "name": "Lifedrinker",
    "icon": "droplets",
    "cat": "attack",
    "uses": "Passive",
    "minLevel": 9,
    "condition": function(C) { return _warlockHasInvocation(C, 'Lifedrinker') && _warlockHasInvocation(C, 'Pact of the Blade'); },
    "damageFormula": "1d6",
    "damageButtonLabel": "Lifedrinker 1d6",
    "desc": "Once per turn when you hit with your Pact Weapon, deal an extra 1d6 Necrotic, Psychic, or Radiant damage (chosen when you take the invocation). You can also expend one Hit Point Die to heal by the roll + CON modifier. Requires Pact of the Blade."
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
  { type: "sense", senseType: "truesight", value: 30, minLevel: 15,
    note: "Witch Sight",
    condition: function(C){ return _warlockHasInvocation(C, "Witch Sight"); } },
  { type: "sense", senseType: "darkvision", value: 120, minLevel: 2,
    note: "Devil's Sight (normal vision in dim light and magical/nonmagical darkness)",
    condition: function(C){ return _warlockHasInvocation(C, "Devil's Sight"); } },
  { type: "advantage", target: "save", ability: "con", minLevel: 1,
    note: "Eldritch Mind (Concentration saves)",
    condition: function(C){ return _warlockHasInvocation(C, "Eldritch Mind"); } },
  { type: "speed", speedType: "swim", value: "walking", minLevel: 5,
    note: "Gift of the Depths",
    condition: function(C){ return _warlockHasInvocation(C, "Gift of the Depths"); } },
  { type: "trait", key: "underwater_breathing", minLevel: 5,
    note: "Gift of the Depths: breathe underwater",
    condition: function(C){ return _warlockHasInvocation(C, "Gift of the Depths"); } },
]);

if (typeof registerClassAtWillSpells === 'function') {
  registerClassAtWillSpells('Warlock', [
    { invocation: 'Armor of Shadows',          spell: 'Mage Armor',      minLevel: 2  },
    { invocation: 'Fiendish Vigor',            spell: 'False Life',      minLevel: 2  },
    { invocation: 'Mask of Many Faces',        spell: 'Disguise Self',   minLevel: 2  },
    { invocation: 'Misty Visions',             spell: 'Silent Image',    minLevel: 2  },
    { invocation: 'One with Shadows',          spell: 'Invisibility',   minLevel: 5  },
    { invocation: 'Otherworldly Leap',         spell: 'Jump',            minLevel: 2  },
    { invocation: 'Ascendant Step',            spell: 'Levitate',        minLevel: 5  },
    { invocation: 'Master of Myriad Forms',    spell: 'Alter Self',      minLevel: 5  },
    { invocation: 'Whispers of the Grave',     spell: 'Speak with Dead', minLevel: 7  },
    { invocation: 'Visions of Distant Realms', spell: 'Arcane Eye',      minLevel: 15 },
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

  [
    'Eldritch Blast',
    'Chill Touch',
    'Mind Sliver',
    'Poison Spray',
    'Toll the Dead',
    'True Strike',
  ].forEach(function (cantripName) {
    registerCantripDataModifier(cantripName, function (data, C) {
      var out = Object.assign({}, data || {});
      if (_warlockHasInvocation(C, 'Agonizing Blast') && _warlockChoiceMatches(C, 'warlock_agonizing_blast_cantrip', cantripName, null)) {
        out.dmgBonusPerBeam = 'cha';
        _pushCantripModifierMeta(out, {
          key: 'agonizing-blast',
          label: 'Agonizing Blast',
          tagLabel: 'Agonizing Blast',
          detailGroupLabel: 'Eldritch Invocations',
          detailTitle: 'Agonizing Blast',
          detailText: 'You can add your Charisma modifier to the damage rolls of this cantrip.',
          description: 'You can add your Charisma modifier to the damage rolls of this cantrip.',
        });
      }
      if (_warlockHasInvocation(C, 'Eldritch Spear') && _warlockChoiceMatches(C, 'warlock_eldritch_spear_cantrip', cantripName, null)) {
        out.range = (30 * Math.max(1, _warlockLevel(C))) + ' ft';
        out.notes = (out.notes ? out.notes + ' · ' : '') + 'Eldritch Spear: range x30';
        _pushCantripModifierMeta(out, {
          key: 'eldritch-spear',
          label: 'Eldritch Spear',
          tagLabel: 'Eldritch Spear',
          detailGroupLabel: 'Eldritch Invocations',
          detailTitle: 'Eldritch Spear',
          detailText: 'When you cast this cantrip, its range is 30 feet times your Warlock level.',
          description: 'When you cast this cantrip, its range is 30 feet times your Warlock level.',
        });
      }
      if (_warlockHasInvocation(C, 'Repelling Blast') && _warlockChoiceMatches(C, 'warlock_repelling_blast_cantrip', cantripName, null)) {
        out.notes = (out.notes ? out.notes + ' · ' : '') + 'Repelling Blast: push 10 ft';
        _pushCantripModifierMeta(out, {
          key: 'repelling-blast',
          label: 'Repelling Blast',
          tagLabel: 'Repelling Blast',
          detailGroupLabel: 'Eldritch Invocations',
          detailTitle: 'Repelling Blast',
          detailText: 'When you hit a Large or smaller creature with this cantrip, you can push that creature up to 10 feet straight away from you.',
          description: 'When you hit a Large or smaller creature with this cantrip, you can push that creature up to 10 feet straight away from you.',
        });
      }
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
