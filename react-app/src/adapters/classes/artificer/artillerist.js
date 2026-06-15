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
registerSubclassAdapter("Artificer_Artillerist", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Woodcarver's Tools"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'artillerist_bonus_tool',
    label: 'Artillerist - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

// [SheetRuntime] START
registerSubclassSheetActions("Artificer_Artillerist", [
  {
    "name": "Eldritch Cannon",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "eldritch_cannon",
    "minLevel": 3,
    "desc": "Action: conjure a Small or Tiny Eldritch Cannon within 5 ft (or in your hand if Tiny). Choose type: Flamethrower (15 ft cone, DEX save = spell DC, 2d8 fire, half on success), Force Ballista (ranged spell attack, 2d8 force, pushed 5 ft), Protector (you + allies within 10 ft gain THP = 1d8 + INT mod). Bonus Action each turn to activate. Lasts 1 hour or until destroyed (AC 18, HP = 5 × Artificer level). 1/LR or expend a spell slot. At lv.15 (Fortified Position): can have 2 active simultaneously."
  },
  {
    "name": "Arcane Firearm",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 5,
    "desc": "Passive: after a Long Rest, use Woodcarver's Tools to carve sigils into a wand, staff, or rod — it becomes your Arcane Firearm. While holding it as a spellcasting focus, once per turn when you cast an Artificer spell through it, roll 1d8 and add it to one damage roll of that spell."
  },
  {
    "name": "Detonate Cannon",
    "icon": "",
    "cat": "reaction",
    "uses": "On Cannon Hit",
    "passive": true,
    "minLevel": 9,
    "rollFormula": "3d10",
    "rollButtonLabel": ({ formula }) => `${formula} force`,
    "rollKind": "damage",
    "rollLabelPrefix": "Detonate",
    "desc": "Reaction when your Eldritch Cannon takes damage (while within 60 ft): command it to detonate. Each creature within 20 ft must succeed on a DEX save (DC = spell save DC) or take 3d10 Force damage (half on success). The cannon is then destroyed."
  },
  {
    "name": "Fortified Position",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 15,
    "desc": "Double Firepower: create both cannons with the same Magic action (expend two uses/spell slots), activate both with the same Bonus Action. Can't create a third. Shimmering Field Projection: you and allies have Half Cover within 10 ft of your Eldritch Cannon."
  }
]);
registerSubclassSheetResources("Artificer_Artillerist", [
  {
    "key": "eldritch_cannon",
    "name": "Eldritch Cannon",
    "icon": "crosshair",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Artillerist", [
  { type: "tool", values: ["Woodcarver's Tools"], minLevel: 3 },
  { type: "weapon", values: ["Martial Ranged"], minLevel: 3 }
]);
// [SheetRuntime] END

}

