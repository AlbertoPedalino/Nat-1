import { createAdapterBindings } from '../../adapterBindings.js';
import { getArtificerConditionalBonusToolCount } from './artificerTools.js';

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
registerSubclassAdapter("Artificer_Alchemist", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Alchemist's Supplies", "Herbalism Kit"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'alchemist_bonus_tool',
    label: 'Alchemist - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

// [SheetRuntime] START
registerSubclassSheetActions("Artificer_Alchemist", [
  {
    "name": "Experimental Elixir",
    "icon": "",
    "cat": "action",
    "uses": "After Long Rest",
    "minLevel": 3,
    "desc": "After a Long Rest (using Alchemist's Supplies), create elixirs: 2 at lv.3, 3 at lv.5, 4 at lv.9, 5 at lv.15. Each has a random (or chosen, if you expend a spell slot via Magic action) effect. Drinking (Bonus Action, administer within 5 ft): 1-Healing (2d8+INT HP; 3d8 at lv.9; 4d8 at lv.15), 2-Swiftness (+10ft Speed 1h; 15ft at lv.9; 20ft at lv.15), 3-Resilience (+1 AC 10 min; 1h at lv.9; 8h at lv.15), 4-Boldness (+1d4 to attack rolls and saves 1 min; 10 min at lv.9; 1h at lv.15), 5-Flight (10ft Fly Speed 10 min; 20ft at lv.9; 30ft at lv.15), 6-Choose (pick any other effect). Elixirs vanish at next Long Rest."
  },
  {
    "name": "Alchemical Savant",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 5,
    "desc": "Passive: when you cast an Artificer spell using Alchemist's Supplies as the spellcasting focus, add your INT modifier (min +1) to one roll that deals Acid, Fire, or Poison damage — or restores Hit Points."
  },
  {
    "name": "Restorative Reagents",
    "icon": "",
    "cat": "action",
    "uses": "INT mod / LR",
    "resKey": "restorative_reagents",
    "minLevel": 9,
    "desc": "Cast Lesser Restoration without expending a spell slot, using Alchemist's Supplies as the spellcasting focus. Uses: INT modifier (min 1). Recharge: Long Rest."
  },
  {
    "name": "Chemical Mastery",
    "icon": "",
    "cat": "action",
    "uses": "Passive + 1/LR",
    "passive": true,
    "resKey": "chemical_mastery",
    "minLevel": 15,
    "desc": "Alchemical Eruption: when you cast an Artificer spell that deals Acid, Fire, or Poison damage to a target, also deal 2d8 Force damage to that target (once per turn). Chemical Resistance: Resistance to Acid and Poison damage; Immunity to the Poisoned condition. Conjured Cauldron: cast Tasha's Bubbling Cauldron without a spell slot, without preparing it, and without Material components (uses Alchemist's Supplies as focus). 1/LR."
  }
]);
registerSubclassSheetResources("Artificer_Alchemist", [
  {
    "key": "restorative_reagents",
    "name": "Restorative Reagents",
    "icon": "flask-conical",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0)
  },
  {
    "key": "chemical_mastery",
    "name": "Conjured Cauldron",
    "icon": "sparkles",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Alchemist", [
  { type: "tool", values: ["Alchemist's Supplies", "Herbalism Kit"], minLevel: 3 }
]);
registerSubclassSheetEffects("Artificer_Alchemist", [
  { type: "resist", damageType: "Acid", minLevel: 15 },
  { type: "resist", damageType: "Poison", minLevel: 15 },
  { type: "condImmune", condition: "Poisoned", minLevel: 15 }
]);
// [SheetRuntime] END

}

