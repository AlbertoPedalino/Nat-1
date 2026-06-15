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
    "rollFormula": ({ ownerLevel }) => Number(ownerLevel || 1) >= 11 ? "1d6" : "1d4",
    "rollButtonLabel": ({ formula }) => `+${formula} psychic`,
    "rollKind": "damage",
    "desc": "Once per turn when you hit a creature with a weapon, deal an extra 1d4 Psychic damage (1d6 at lv.11)."
  },
  {
    "name": "Otherworldly Glamour",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Passive: whenever you make a Charisma check, add your WIS modifier as a bonus (minimum +1). You gain proficiency in one of: Deception, Performance, or Persuasion (your choice)."
  },
  {
    "name": "Beguiling Twist",
    "icon": "",
    "cat": "reaction",
    "uses": "At will",
    "minLevel": 7,
    "desc": "Passive: Advantage on saving throws to avoid or end the Charmed or Frightened condition. Reaction — when you or a creature you can see within 120 ft succeeds on a saving throw to avoid or end Charmed or Frightened: force a different creature you can see within 120 ft to make a WIS saving throw (spell save DC). On a failed save, the target is Charmed or Frightened (your choice) for 1 minute; it repeats the save at the end of each of its turns, ending the effect on a success."
  },
  {
    "name": "Fey Reinforcements",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR (free slot)",
    "resKey": "fey_reinforcements",
    "minLevel": 11,
    "desc": "You can cast Summon Fey without a Material component. Once per Long Rest you can cast it without expending a spell slot; additional castings require a spell slot. Whenever you start casting the spell, you can modify it to not require Concentration — if you do, the spell's duration becomes 1 minute."
  },
  {
    "name": "Misty Wanderer",
    "icon": "",
    "cat": "bonus",
    "uses": "WIS mod / LR",
    "resKey": "fey_misty_wanderer",
    "minLevel": 15,
    "desc": "You can cast Misty Step without expending a spell slot (WIS modifier uses, min 1, per Long Rest). Whenever you cast Misty Step, you can bring one willing creature you can see within 5 ft along — it teleports to an unoccupied space of your choice within 5 ft of your destination."
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

