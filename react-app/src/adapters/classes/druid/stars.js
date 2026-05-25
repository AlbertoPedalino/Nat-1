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
registerSubclassAdapter("Druid_Stars", function (cls, lv, specs) {});

// [SheetRuntime] START
registerSubclassSheetActions("Druid_Stars", [
  {
    "name": "Star Map",
    "icon": "",
    "cat": "action",
    "uses": "WIS mod / LR",
    "resKey": "stars_guiding_bolt",
    "minLevel": 3,
    "desc": "You create a star chart (Tiny object) that serves as your spellcasting focus. The Guidance and Guiding Bolt spells are always prepared for you. You can cast Guiding Bolt without expending a spell slot (WIS modifier uses, min 1, per Long Rest). If you lose the map, perform a 1-hour ceremony to create a replacement (can be done during a Short or Long Rest)."
  },
  {
    "name": "Starry Form",
    "icon": "",
    "cat": "bonus",
    "uses": "Wild Shape charge",
    "resKey": "wild_shape",
    "minLevel": 3,
    "desc": "Spend a Wild Shape use to take on a starry form for 10 minutes (retain your stats; body becomes luminous, sheds Bright Light 10 ft and Dim Light 10 ft beyond). Choose one constellation: Archer — when you activate this form and as a Bonus Action on subsequent turns, make a ranged spell attack (60 ft, 1d8+WIS Radiant on hit; 2d8+WIS at lv.10). Chalice — when you cast a spell using a spell slot that restores HP to a creature, you or another creature within 30 ft also regains 1d8+WIS HP (2d8+WIS at lv.10). Dragon — when you make an INT or WIS check or a CON save to maintain Concentration, treat a d20 roll of 9 or lower as a 10. At lv.10, you can change constellation at the start of each of your turns."
  },
  {
    "name": "Cosmic Omen",
    "icon": "",
    "cat": "reaction",
    "uses": "WIS mod / LR",
    "resKey": "stars_cosmic_omen",
    "minLevel": 6,
    "desc": "After each Long Rest, consult your Star Map and roll any die. Even = Weal, Odd = Woe. Uses: WIS modifier (min 1) per Long Rest. Reaction when a creature you can see within 30 ft is about to make a D20 Test: Weal — roll 1d6 and add the number to the roll. Woe — roll 1d6 and subtract the number from the roll."
  },
  {
    "name": "Twinkling Constellations",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 10,
    "desc": "Passive: while in Starry Form, the Archer and Chalice damage/healing increases to 2d8+WIS. The Dragon form instead grants a Fly Speed of 20 ft with Hover. Additionally, at the start of each of your turns while in Starry Form, you can change which constellation glimmers on your body."
  },
  {
    "name": "Full of Stars",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 14,
    "desc": "Passive: while in Starry Form, you become partially incorporeal and gain Resistance to Bludgeoning, Piercing, and Slashing damage."
  }
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Druid_Stars", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Guidance", minLevel: 3, level: 0 },
        { name: "Guiding Bolt", minLevel: 3, level: 1 },
      ],
    },
  });
}
registerSubclassSheetResources("Druid_Stars", [
  {
    "key": "stars_guiding_bolt",
    "name": "Guiding Bolt (free)",
    "icon": "star",
    "recharge": "LR",
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  },
  {
    "key": "stars_cosmic_omen",
    "name": "Cosmic Omen",
    "icon": "sparkles",
    "recharge": "LR",
    "max": (lv, { wis } = {}) => Math.max(1, wis ?? 0)
  }
]);

registerSubclassSheetEffects("Druid_Stars", [

  { type: "d20-floor", minRoll: 10, minLevel: 3, note: "Starry Form: Dragon constellation for INT/WIS checks and Concentration saves." },
  { type: "speed", speedType: "fly", value: 20, minLevel: 10, note: "Twinkling Constellations: Dragon form fly speed with Hover." },
  { type: "resistance", damageTypes: ["Bludgeoning", "Piercing", "Slashing"], minLevel: 14, note: "Full of Stars while Starry Form is active." },

]);
// [SheetRuntime] END

}

