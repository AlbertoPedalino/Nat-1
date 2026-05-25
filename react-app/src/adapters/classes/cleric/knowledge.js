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
registerSubclassAdapter("Cleric_Knowledge", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_knowledge_skills',
      label: 'Blessings of Knowledge — Skill Proficiency',
      type: 'skill_choice',
      from: ['Arcana', 'History', 'Nature', 'Religion'],
      count: 2,
      level: 3
    });
    specs.push({
      key: 'subclass_knowledge_tool',
      label: 'Blessings of Knowledge — Artisan\'s Tool',
      type: 'generic_choice',
      from: _ARTISAN_TOOLS || [],
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Cleric_Knowledge", [
  {
    "name": "Channel: Mind Magic",
    "icon": "",
    "cat": "action",
    "uses": "1 Channel",
    "resKey": "channel_div",
    "desc": "Magic action: expend one use of Channel Divinity to cast a spell from the Divination school on the Knowledge Domain Spells table that you have prepared. Cast it without expending a spell slot or needing Material components."
  },
  {
    "name": "Unfettered Mind",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 6,
    "desc": "You gain Telepathy out to 60 ft. When you use this Telepathy, you can simultaneously contact a number of creatures equal to your WIS modifier (minimum 1). Additionally, you gain proficiency in Intelligence saving throws. If you already have that proficiency, gain proficiency in one other saving throw of your choice."
  },
  {
    "name": "Divine Foreknowledge",
    "icon": "",
    "cat": "bonus",
    "uses": "1 / LR",
    "resKey": "divine_foreknowledge",
    "minLevel": 17,
    "desc": "Bonus Action to expand your mind to the future. For 1 hour, you have Advantage on D20 Tests. Once per Long Rest. You can restore this use by expending a level 6+ spell slot (no action required)."
  }
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Cleric_Knowledge", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Command", minLevel: 3, level: 1 },
        { name: "Comprehend Languages", minLevel: 3, level: 1 },
        { name: "Detect Magic", minLevel: 3, level: 1 },
        { name: "Detect Thoughts", minLevel: 3, level: 2 },
        { name: "Identify", minLevel: 3, level: 1 },
        { name: "Mind Spike", minLevel: 3, level: 2 },
        { name: "Dispel Magic", minLevel: 5, level: 3 },
        { name: "Nondetection", minLevel: 5, level: 3 },
        { name: "Tongues", minLevel: 5, level: 3 },
        { name: "Arcane Eye", minLevel: 7, level: 4 },
        { name: "Banishment", minLevel: 7, level: 4 },
        { name: "Confusion", minLevel: 7, level: 4 },
        { name: "Legend Lore", minLevel: 9, level: 5 },
        { name: "Scrying", minLevel: 9, level: 5 },
        { name: "Synaptic Static", minLevel: 9, level: 5 },
      ],
    },
  });
}

registerSubclassSheetEffects("Cleric_Knowledge", [

  { type: "passiveNote", minLevel: 3, note: "Blessings of Knowledge: gain proficiency in 2 skills (Arcana, History, Nature, or Religion) and one Artisan's Tool of your choice." },
  { type: "passiveNote", minLevel: 3, note: "Mind Magic: as a Magic action, expend 1 Channel Divinity to cast a prepared Divination spell from your Domain Spells without a spell slot or Material components." },
  { type: "passiveNote", minLevel: 6, note: "Unfettered Mind: Telepathy 60 ft; proficiency in INT saves." },
  { type: "advantage", target: "d20Tests", minLevel: 17, note: "Divine Foreknowledge: BA, 1 hour Advantage on all D20 Tests." },
]);
if (typeof registerSubclassSheetResources === "function") {
  registerSubclassSheetResources("Cleric_Knowledge", [
    { key: "divine_foreknowledge", name: "Divine Foreknowledge", icon: "brain", recharge: "LR",
      max: (lv) => lv >= 17 ? 1 : 0 },
  ]);
}
// [SheetRuntime] END

}

