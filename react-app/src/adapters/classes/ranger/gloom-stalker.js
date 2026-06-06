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
registerSubclassAdapter("Ranger_Gloom Stalker", function (cls, lv, specs) {});

// [SheetRuntime] START
registerSubclassSheetActions("Ranger_Gloom Stalker", [
  {
    "name": "Dread Ambusher",
    "icon": "",
    "cat": "attack",
    "uses": "WIS mod / LR",
    "resKey": "dread_ambusher",
    "minLevel": 3,
    "damageFormula": ({ ownerLevel }) => Number(ownerLevel || 1) >= 11 ? "2d8" : "2d6",
    "damageButtonLabel": ({ formula }) => `+${formula} psychic`,
    "damageKind": "damage",
    "desc": "At the start of your first turn of each combat, your Speed increases by 10 ft until the end of that turn. When you add your WIS modifier to Initiative rolls. When you attack a creature and hit it with a weapon, you can deal an extra 2d6 Psychic damage (once per turn). Uses: WIS modifier (min 1) per Long Rest. The damage increases to 2d8 at lv.11 (Stalker's Flurry)."
  },
  {
    "name": "Umbral Sight",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Passive: you gain Darkvision with a range of 60 ft (or +60 ft if you already have it). While entirely in Darkness, you have the Invisible condition to any creature that relies on Darkvision to see you in that Darkness."
  },
  {
    "name": "Iron Mind",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    "desc": "Passive: you gain proficiency in WIS saving throws. If you already have this proficiency, you instead gain proficiency in INT or CHA saving throws (your choice)."
  },
  {
    "name": "Stalker's Flurry",
    "icon": "",
    "cat": "attack",
    "uses": "On Dread Ambusher hit",
    "passive": true,
    "minLevel": 11,
    "desc": "Your Dread Ambusher Psychic damage increases to 2d8. In addition, when you deal that extra Psychic damage, you can cause one of these additional effects: Extra Strike — make another attack with the same weapon against a different creature within 5 ft of the original target and within weapon range; Mass Fear — the target and each creature within 10 ft of it must make a WIS saving throw (spell save DC) or have the Frightened condition until the start of your next turn."
  },
  {
    "name": "Shadowy Dodge",
    "icon": "",
    "cat": "reaction",
    "uses": "At will",
    "minLevel": 15,
    "desc": "Reaction when a creature makes an attack roll against you: impose Disadvantage on that roll. Whether the attack hits or misses, you can then teleport up to 30 ft to an unoccupied space you can see."
  }
]);
registerSubclassSheetResources("Ranger_Gloom Stalker", [
  {
    "key": "dread_ambusher",
    "name": "Dread Ambusher",
    "icon": "eye",
    "recharge": "LR",
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  }
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Ranger_Gloom Stalker", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Disguise Self", minLevel: 3, level: 1 },
        { name: "Rope Trick", minLevel: 5, level: 2 },
        { name: "Fear", minLevel: 9, level: 3 },
        { name: "Greater Invisibility", minLevel: 13, level: 4 },
        { name: "Seeming", minLevel: 17, level: 5 }
      ],
    },
  });
}

registerSubclassSheetEffects("Ranger_Gloom Stalker", [

  { type: "sense", senseType: "darkvision", value: 60, additive: true, minLevel: 3, note: "Umbral Sight: gain Darkvision 60 ft or +60 ft if you already have it." },
  { type: "initiativeAbilityMod", ability: "wis", minLevel: 3, note: "Dread Ambusher." },
  { type: "saveProficiency", ability: "wis", minLevel: 7, note: "Iron Mind: if already proficient, choose INT or CHA instead." },

]);
// [SheetRuntime] END

}

