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
registerSubclassRuntimeConfig("Rogue_Arcane Trickster", {
  spellcasting: {
    ability: "int",
    casterProgression: "1/3",
    cantripKnown: [0, 0, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    spellsKnown: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
    preparedSpellsProgression: [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13],
    choiceSpellSources: {
      subclass_at_cantrip_1: { label: "Arcane Trickster", ability: "int" },
      subclass_at_cantrip_2: { label: "Arcane Trickster", ability: "int" },
    },
  },
});

registerSubclassAdapter("Rogue_Arcane Trickster", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: "subclass_at_cantrip_1",
      label: "Arcane Trickster - Cantrip Wizard 1",
      type: "spell_choice",
      spellFilter: { spellLevel: 0, classes: ["Wizard"] },
      count: 1,
      level: 3
    });
    specs.push({
      key: "subclass_at_cantrip_2",
      label: "Arcane Trickster - Cantrip Wizard 2",
      type: "spell_choice",
      spellFilter: { spellLevel: 0, classes: ["Wizard"] },
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Rogue_Arcane Trickster", [
  {
    "name": "Mage Hand Legerdemain",
    "icon": "",
    "cat": "bonus",
    "uses": "Unlimited",
    "minLevel": 3,
    "desc": "When you cast Mage Hand, you can cast it as a Bonus Action and make the spectral hand Invisible. You can control the hand as a Bonus Action and make DEX (Sleight of Hand) checks through it."
  },
  {
    "name": "Magical Ambush",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 9,
    "desc": "Passive: if you have the Invisible condition when you cast a spell on a creature, it has Disadvantage on any saving throw it makes against the spell on the same turn."
  },
  {
    "name": "Versatile Trickster",
    "icon": "",
    "cat": "action",
    "uses": "Cunning Strike option",
    "minLevel": 13,
    "desc": "Cunning Strike upgrade — Trip option: when you use the Trip option of your Cunning Strike on a creature, you can also use that option on another creature within 5 feet of your spectral Mage Hand."
  },
  {
    "name": "Spell Thief",
    "icon": "",
    "cat": "reaction",
    "uses": "1 / LR",
    "resKey": "spell_thief",
    "minLevel": 17,
    "desc": "Reaction — immediately after a creature casts a spell that targets you or includes you in its area of effect: force the creature to make an INT saving throw (spell save DC). On a failed save, you negate the spell's effect against you and steal the knowledge of the spell if it is at least level 1 and of a level you can cast (need not be a Wizard spell). For the next 8 hours, you have the spell prepared and the creature cannot cast it. Recharge: Long Rest."
  }
]);
registerSubclassSheetResources("Rogue_Arcane Trickster", [
  {
    "key": "spell_thief",
    "name": "Spell Thief",
    "icon": "wand",
    "recharge": "LR",
    "max": () => 1
  }
]);
// [SheetRuntime] END

}

