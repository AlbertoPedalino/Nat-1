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
registerSubclassAdapter("Ranger_Hunter", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_hunter_prey',
      label: "Hunter's Prey (swappable on rest)",
      type: 'generic_choice',
      from: ['Colossus Slayer', 'Horde Breaker'],
      count: 1,
      level: 3
    });
  }
  if (lv >= 7) {
    specs.push({
      key: 'subclass_hunter_defensive',
      label: 'Defensive Tactics (swappable on rest)',
      type: 'generic_choice',
      from: ['Escape the Horde', 'Multiattack Defense'],
      count: 1,
      level: 7
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Ranger_Hunter", [
  {
    "name": "Hunter's Lore",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Passive: while a creature is marked by your Hunter's Mark, you know whether that creature has any Immunities, Resistances, or Vulnerabilities, and if so, what they are."
  },
  {
    "name": "Hunter's Prey",
    "icon": "",
    "cat": "attack",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "noRoll": true,
    "desc": "Choose one option (swappable on Short or Long Rest): Colossus Slayer — when you hit a creature with a weapon, deal an extra 1d8 damage if the target is missing any HP (once per turn). Horde Breaker — once per turn when you make an attack with a weapon, make another attack with the same weapon against a different creature within 5 ft of the original target (within weapon range) that you haven't attacked this turn."
  },
  {
    "name": "Defensive Tactics",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    "desc": "Choose one option (swappable on Short or Long Rest): Escape the Horde — Opportunity Attacks against you have Disadvantage. Multiattack Defense — when a creature hits you with an attack roll, that creature has Disadvantage on all other attack rolls against you for the rest of this turn."
  },
  {
    "name": "Superior Hunter's Prey",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    "minLevel": 11,
    "desc": "Once per turn, when you deal damage to a creature marked by your Hunter's Mark, you can also deal that spell's extra damage to a different creature you can see within 30 ft of the first creature."
  },
  {
    "name": "Superior Hunter's Defense",
    "icon": "",
    "cat": "reaction",
    "uses": "At will",
    "minLevel": 15,
    "desc": "Reaction when you take damage: give yourself Resistance to that damage type and any other damage of the same type until the end of the current turn."
  }
]);

registerSubclassSheetEffects("Ranger_Hunter", [

  { type: "damageRider", minLevel: 3, note: "Hunter's Prey choice." },
  { type: "defenseReaction", minLevel: 7, note: "Defensive Tactics choice." },
  { type: "cleaveDamage", minLevel: 11, note: "Superior Hunter's Prey." },
  { type: "damageResistanceReaction", minLevel: 15, note: "Superior Hunter's Defense." },
]);
// [SheetRuntime] END

}

