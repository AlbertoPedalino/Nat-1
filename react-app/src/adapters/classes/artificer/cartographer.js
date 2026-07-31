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
registerSubclassAdapter("Artificer_Cartographer", function (cls, lv, specs, ctx = {}) {
  if (lv < 3) return;
  const bonusCount = getArtificerConditionalBonusToolCount(ctx, ["Calligrapher's Supplies", "Cartographer's Tools"], cls);
  if (!bonusCount) return;
  specs.push({
    key: 'cartographer_bonus_tool',
    label: 'Cartographer - Bonus Artisan Tool',
    type: 'generic_choice',
    from: _ARTISAN_TOOLS,
    count: bonusCount,
    level: 3
  });
});

// [SheetRuntime] START
registerSubclassSheetActions("Artificer_Cartographer", [
  {
    "name": "Scroll Crafting",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Passive: when you scribe a Spell Scroll using the crafting rules, the time required is halved."
  },
  {
    "name": "Adventurer's Atlas",
    "icon": "",
    "cat": "action",
    "uses": "After Long Rest",
    "minLevel": 3,
    "desc": "After a Long Rest (Cartographer's Tools in hand): touch up to 1 + INT modifier creatures (min 2, can include yourself). Each receives a magical map showing the relative position of all map holders (illegible to others). Benefits while holding: Awareness (+1d4 to Initiative rolls), Positioning (know location of all holders on same plane; can target another holder with spells/effects without line of sight/cover, within range). Maps last until you die or use this feature again."
  },
  {
    "name": "Mapping Magic",
    "icon": "",
    "cat": "action",
    "uses": "INT mod / LR",
    "resKey": "mapping_magic_faerie",
    "minLevel": 3,
    "desc": "Illuminated Cartography: cast Faerie Fire without a spell slot (creatures outlined as if in ink). Uses: INT modifier (min 1) per Long Rest. Portal Jump: on your turn, spend movement equal to half your Speed (round down) to teleport to an unoccupied space you can see within 10 ft of yourself or within 5 ft of a map holder within 30 ft. Can't use if Speed is 0."
  },
  {
    "name": "Guided Precision",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    "minLevel": 5,
    "desc": "Once per turn, when you cast a spell from your Cartographer spell list or hit a creature affected by your Faerie Fire with an attack roll, add your INT modifier to one damage roll of that spell or attack. Additionally, taking damage can't cause you to lose Concentration on Faerie Fire."
  },
  {
    "name": "Ingenious Movement",
    "icon": "",
    "cat": "reaction",
    "uses": "On Flash of Genius",
    "passive": true,
    "minLevel": 9,
    "desc": "When you use Flash of Genius, you or one willing creature you can see within 30 ft can also teleport up to 30 ft to an unoccupied space you can see, as part of the same Reaction."
  },
  {
    "name": "Superior Atlas",
    "icon": "",
    "cat": "action",
    "uses": "Passive + 1/LR",
    "passive": true,
    "resKey": "superior_atlas_path",
    "minLevel": 15,
    "desc": "Safe Haven: when a map holder would drop to 0 HP but not be killed outright, that creature can destroy its map — its HP instead change to twice your Artificer level, and it teleports to within 5 ft of you or another map holder of its choice. Unerring Path: if you are one of the map holders, cast Find the Path without a spell slot, without preparing it, and without spell components. 1/LR."
  }
]);
registerSubclassSheetResources("Artificer_Cartographer", [
  {
    "key": "mapping_magic_faerie",
    "name": "Faerie Fire (Mapping Magic)",
    "icon": "sparkles",
    "recharge": "LR",
    "max": (lv, { int } = {}) => Math.max(1, int ?? 0)
  },
  {
    "key": "superior_atlas_path",
    "name": "Unerring Path",
    "icon": "map",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerSubclassSheetProficiencies("Artificer_Cartographer", [
  { type: "tool", values: ["Calligrapher's Supplies", "Cartographer's Tools"], minLevel: 3 }
]);
// [SheetRuntime] END

}

