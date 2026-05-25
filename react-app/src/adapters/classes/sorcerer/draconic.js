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
const _DRAGON_ANCESTORS = [
  'Black (Acid)', 'Blue (Lightning)', 'Brass (Fire)', 'Bronze (Lightning)',
  'Copper (Acid)', 'Gold (Fire)', 'Green (Poison)', 'Red (Fire)',
  'Silver (Cold)', 'White (Cold)',
];

registerSubclassAdapter("Sorcerer_Draconic", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_draconic_ancestor',
      label: 'Dragon Ancestor (Draconic Sorcery)',
      type: 'generic_choice',
      from: _DRAGON_ANCESTORS,
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Sorcerer_Draconic", [
  {
    "name": "Draconic Resilience",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Passive: your Hit Point maximum increases by 3 at lv.3 and by 1 for each additional Sorcerer level. While you aren't wearing armor, your base AC equals 10 + DEX modifier + CHA modifier."
  },
  {
    "name": "Elemental Affinity",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 6,
    "desc": "Choose one damage type: Acid, Cold, Fire, Lightning, or Poison. You have permanent Resistance to that damage type. When you cast a spell that deals damage of that type, you can add your CHA modifier to one damage roll of that spell."
  },
  {
    "name": "Dragon Wings",
    "icon": "",
    "cat": "bonus",
    "uses": "1 / LR",
    "resKey": "draconic_wings",
    "minLevel": 14,
    "desc": "Bonus Action: cause draconic wings to appear on your back for 1 hour, or until you dismiss them (no action required). For the duration, you have a Fly Speed of 60 ft. 1/LR, or spend 3 Sorcery Points (no action) to restore this use."
  },
  {
    "name": "Dragon Companion",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR (free slot)",
    "resKey": "draconic_companion",
    "minLevel": 18,
    "desc": "You can cast Summon Dragon without a Material component. Once per Long Rest you can cast it without expending a spell slot; additional castings require a spell slot. Whenever you start casting the spell, you can modify it to not require Concentration — if you do, the spell's duration becomes 1 minute."
  }
]);
registerSubclassSheetResources("Sorcerer_Draconic", [
  {
    "key": "draconic_wings",
    "name": "Dragon Wings",
    "icon": "feather",
    "recharge": "LR",
    "max": () => 1
  },
  {
    "key": "draconic_companion",
    "name": "Dragon Companion (free cast)",
    "icon": "star",
    "recharge": "LR",
    "max": () => 1
  }
]);

registerSubclassSheetEffects("Sorcerer_Draconic", [

  { type: "acFormula", key: "sorcerer_draconic_resilience", label: "Draconic Resilience", base: 10, abilities: ["dex", "cha"], allowShield: false, requiresNoArmor: true, minLevel: 3 },
  { type: "hpBonus", amount: 3, minLevel: 3, perLevelAfter: 1, note: "Draconic Resilience: +3 HP at level 3, +1 per Sorcerer level thereafter." },
  { type: "resistance-choice", key: "subclass_draconic_ancestor", minLevel: 6, note: "Elemental Affinity: resistance based on Dragon Ancestor.",
    map: {
      black: 'Acid', copper: 'Acid',
      blue: 'Lightning', bronze: 'Lightning',
      brass: 'Fire', gold: 'Fire', red: 'Fire',
      green: 'Poison',
      silver: 'Cold', white: 'Cold',
    } },
  { type: "speed", speedType: "fly", value: 60, minLevel: 14, note: "Dragon Wings while active." },

]);
// [SheetRuntime] END

}

