import { createAdapterBindings } from '../../adapterBindings.js';

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
  } = createAdapterBindings(registry, context);
// Metamagic XPHB 2024
const _METAMAGIC = [
  'Careful Spell', 'Distant Spell', 'Empowered Spell', 'Extended Spell',
  'Heightened Spell', 'Quickened Spell', 'Seeking Spell', 'Subtle Spell',
  'Transmuted Spell', 'Twinned Spell',
];

// Progressione: +2 a L2, +2 a L10, +2 a L17 (totale max 6)
const _MM_SLOTS = [
  { idx: 1, level: 2 }, { idx: 2, level: 2 },
  { idx: 3, level: 10 }, { idx: 4, level: 10 },
  { idx: 5, level: 17 }, { idx: 6, level: 17 },
];

registerClassAdapter("Sorcerer", function (cls, lv, specs, ctx = {}) {
  if (lv >= 2) {
    const count = lv >= 17 ? 6 : lv >= 10 ? 4 : 2;
    specs.push({
      key: 'sorcerer_metamagic',
      label: 'Metamagic',
      type: 'generic_choice',
      from: _METAMAGIC,
      count,
      level: 2
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'sorcerer_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Sorcerer", [
  {
    "name": "Innate Sorcery",
    "icon": "",
    "cat": "bonus",
    "uses": "2 / LR",
    "resKey": "innate_sorcery",
    "_toggleKey": "innate_sorcery",
    "minLevel": 1,
    "desc": "Bonus Action: unleash magical energy for 1 minute. During this time your spell save DC increases by 1, and you have Advantage on the attack rolls of Sorcerer spells you cast. Uses: 2 per Long Rest. Recharge: Long Rest."
  },
  {
    "name": "Font of Magic",
    "icon": "",
    "cat": "action",
    "uses": "Sorcery Points",
    "resKey": "sorc_pts",
    "minLevel": 2,
    "desc": "Sorcery Points = Sorcerer level (replenish on Long Rest). Spend points to create spell slots or convert slots into points. Creating a slot: lv.1=2pt, lv.2=3pt, lv.3=5pt, lv.4=6pt, lv.5=7pt."
  },
  {
    "name": "Metamagic",
    "icon": "",
    "cat": "action",
    "uses": "Sorcery Points",
    "resKey": "sorc_pts",
    "minLevel": 2,
    "desc": "Modify spells with Sorcery Points. Options: Careful (2pt, allies auto-succeed save), Distant (1pt, double range), Empowered (1pt, reroll damage dice up to CHA mod), Extended (1pt, double duration), Heightened (3pt, target has Disadvantage on first save), Quickened (2pt, cast as Bonus Action), Seeking (1pt/miss, reroll attack), Subtle (1pt, no V or S component), Transmuted (1pt, change damage type), Twinned (1pt, second target same spell)."
  },
  {
    "name": "Sorcerous Restoration",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "sorc_restoration",
    "minLevel": 5,
    "desc": "When you finish a Short Rest, you can regain expended Sorcery Points equal to half your Sorcerer level (rounded down). You can use this feature once per Long Rest."
  },
  {
    "name": "Create Spell Slot (Font of Magic)",
    "icon": "",
    "cat": "action",
    "uses": "Sorcery Points",
    "resKey": "sorc_create_slot",
    "minLevel": 2,
    "buttonLabel": "Create Slot",
    "desc": "Spend Sorcery Points to create a spell slot. Costs: L1=2 SP, L2=3 SP, L3=5 SP, L4=6 SP, L5=7 SP."
  },
  {
    "name": "Convert Spell Slot (Font of Magic)",
    "icon": "",
    "cat": "action",
    "uses": "Spell slot",
    "resKey": "sorc_convert_slot",
    "minLevel": 2,
    "buttonLabel": "Convert Slot",
    "desc": "Convert an expended spell slot into Sorcery Points equal to the slot's level."
  },
  {
    "name": "Sorcery Incarnate",
    "icon": "",
    "cat": "bonus",
    "uses": "2 SP",
    "resKey": "sorc_pts",
    "minLevel": 7,
    "desc": "While Innate Sorcery is active, you can apply two different Metamagic options to the same spell. If you have no uses of Innate Sorcery remaining, you can spend 2 Sorcery Points to activate it again."
  },
  {
    "name": "Arcane Apotheosis",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 20,
    "desc": "While Innate Sorcery is active, you can use one Metamagic option on each spell you cast without spending Sorcery Points."
  }
]);
// Innate Sorcery (while active): +1 spell save DC and Advantage on the attack
// rolls of Sorcerer spells. The on/off flag lives on the character as
// innate_sorceryActive, set by the action's _toggleKey toggle. spellAttackAdvantage
// is scoped via spellClass so only Sorcerer-owned spells benefit (multiclass-safe).
function _sorcererInnateActive(C) { return !!C && C.innate_sorceryActive === true; }

registerClassSheetEffects("Sorcerer", [
  { type: "spellSaveDcBonus", value: 1, minLevel: 1, note: "Innate Sorcery", condition: _sorcererInnateActive },
  { type: "spellAttackAdvantage", spellClass: "Sorcerer", minLevel: 1, note: "Innate Sorcery", condition: _sorcererInnateActive },
]);
registerClassSheetResources("Sorcerer", [
  {
    "key": "sorc_restoration",
    "name": "Sorcerous Restoration",
    "icon": "refresh-cw",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "innate_sorcery",
    "name": "Innate Sorcery",
    "icon": "sparkles",
    "recharge": "LR",
    "max": () => 2
  },
  {
    "key": "sorc_pts",
    "name": "Sorcery Points",
    "icon": "orbit",
    "recharge": "LR",
    "max": (lv)=>lv,
    "pool": true
  },
  {
    "key": "sorc_create_slot",
    "name": "Create/Restore Slot",
    "icon": "sparkles",
    "recharge": "LR",
    "max": () => Infinity,
    "pool": true
  },
  {
    "key": "sorc_convert_slot",
    "name": "Convert Spell Slot",
    "icon": "refresh-cw",
    "recharge": "LR",
    "max": () => Infinity,
    "pool": true
  }
]);

if (typeof registerResourceSideEffect === 'function') {
  registerResourceSideEffect('sorc_restoration', function (ctx = {}) {
    const C = ctx.character || ctx.C;
    let sorcLv = 0;
    if (String(C?.className || '').toLowerCase() === 'sorcerer') sorcLv += C?.classLevel || C?.level || 0;
    (C?.extraClasses || []).forEach(function (ec) {
      if (String(ec?.name || '').toLowerCase() === 'sorcerer') sorcLv += ec.level || 0;
    });
    if (!sorcLv) return null;
    return {
      type: 'recover_resource',
      targetResourceKey: 'sorc_pts',
      amount: Math.floor(sorcLv / 2),
      label: 'Sorcerous Restoration',
    };
  });

  registerResourceSideEffect('sorc_create_slot', function (ctx = {}) {
    const C = ctx.character || ctx.C;
    const res = ctx.resources || {};
    const currentSP = Number(res.sorc_pts || 0);
    if (currentSP < 2) return null;
    const sorcLv = (() => {
      let lv = 0;
      if (String(C?.className || '').toLowerCase() === 'sorcerer') lv += C?.classLevel || C?.level || 0;
      (C?.extraClasses || []).forEach(function (ec) {
        if (String(ec?.name || '').toLowerCase() === 'sorcerer') lv += ec.level || 0;
      });
      return lv;
    })();
    return {
      type: 'create_spell_slot_from_points',
      sourceResourceKey: 'sorc_pts',
      currentSP,
      maxSorcererLevel: sorcLv,
      conversionTable: { 1: 2, 2: 3, 3: 5, 4: 6, 5: 7 },
      maxCreatedSlotLevel: 5,
      label: 'Create Spell Slot',
    };
  });

  registerResourceSideEffect('sorc_convert_slot', function (ctx = {}) {
    return {
      type: 'convert_spell_slot_to_points',
      targetResourceKey: 'sorc_pts',
      label: 'Convert Spell Slot',
    };
  });
}
// [SheetRuntime] END

}

