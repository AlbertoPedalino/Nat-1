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
registerSubclassAdapter("Ranger_Fey Wanderer", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_fey_wanderer_skill',
      label: 'Otherworldly Glamour — Skill Proficiency',
      type: 'skill_choice',
      from: ['Deception', 'Performance', 'Persuasion'],
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Ranger_Fey Wanderer", [
  {
    "name": "Dreadful Strikes",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    "minLevel": 3,
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => Number(ownerLevel || 1) >= 11 ? "1d6" : "1d4", label: ({ formula }) => `+${formula} psychic` }]
  },
  {
    "name": "Beguiling Twist",
    "icon": "",
    "cat": "reaction",
    "uses": "At will",
    "minLevel": 7
  },
  {
    "name": "Fey Reinforcements",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR (free slot)",
    "resKey": "fey_reinforcements",
    "minLevel": 11
  },
  {
    "name": "Misty Wanderer",
    "icon": "",
    "cat": "bonus",
    "uses": "WIS mod / LR",
    "resKey": "fey_misty_wanderer",
    "minLevel": 15
  }
]);
registerSubclassSheetResources("Ranger_Fey Wanderer", [
  {
    "key": "fey_reinforcements",
    "name": "Fey Reinforcements",
    "icon": "star",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "fey_misty_wanderer",
    "name": "Misty Wanderer",
    "icon": "cloud",
    "recharge": "LR",
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  }
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Ranger_Fey Wanderer", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Charm Person", minLevel: 3, level: 1 },
        { name: "Misty Step", minLevel: 5, level: 2 },
        { name: "Dispel Magic", minLevel: 9, level: 3 },
        { name: "Dimension Door", minLevel: 13, level: 4 },
        { name: "Mislead", minLevel: 17, level: 5 }
      ],
    },
  });
}

registerSubclassSheetEffects("Ranger_Fey Wanderer", [

  { type: "skillBonus", ability: "cha", bonusAbility: "wis", minLevel: 3, note: "Otherworldly Glamour: add WIS modifier to CHA checks." },
  { type: "advantage", target: "save", conditions: ["Charmed", "Frightened"], minLevel: 7, note: "Beguiling Twist." },

]);
// [SheetRuntime] END

}

