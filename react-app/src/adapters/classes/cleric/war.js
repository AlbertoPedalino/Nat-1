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
// War Domain (XPHB): tutte le feature sono passive o azioni fisse, nessuna scelta di build.
// L3: War Priest, Guided Strike (CD)
// L6: War God's Blessing (CD)
// L17: Avatar of Battle (resistenze B/P/S)
// War Domain grants Heavy Armor and Martial Weapon proficiency
registerSubclassSheetProficiencies("Cleric_War", [
  { type: "armor", values: ["Heavy"], minLevel: 3 },
  { type: "weapon", values: ["Martial"], minLevel: 3 },
]);

registerSubclassAdapter("Cleric_War", function (cls, lv, specs) {
  // nessuna spec
});

// [SheetRuntime] START
registerSubclassSheetActions("Cleric_War", [
  { name: "War Priest", icon: "", cat: "bonus", uses: "WIS mod / SR+LR", resKey: "war_priest", minLevel: 3,
    desc: "Bonus Action: make one attack with a weapon or Unarmed Strike. Uses = WIS modifier (min 1) per Short or Long Rest." },
  { name: "Guided Strike", icon: "", cat: "reaction", uses: "1 Channel", resKey: "channel_div", minLevel: 3,
    desc: "When you or a creature within 30 ft misses with an attack roll, expend one use of Channel Divinity to add +10 to that roll, potentially causing it to hit. Benefiting another creature's attack roll requires your Reaction." },
  { name: "War God's Blessing", icon: "", cat: "reaction", uses: "1 Channel", resKey: "channel_div", minLevel: 6,
    desc: "Reaction: when a creature within 30 ft of you makes an attack roll, expend one use of Channel Divinity to grant that creature a +10 bonus to the roll. You make this choice after you see the roll, but before the DM says whether it hits or misses." },
  { name: "Avatar of Battle", icon: "", cat: "action", uses: "Passive", minLevel: 17,
  passive: true,
    desc: "Resistance to Bludgeoning, Piercing, and Slashing damage." },
]);
registerSubclassSheetResources("Cleric_War", [
  { key: "war_priest", name: "War Priest", icon: "swords", recharge: "SR+LR",
    max: (lv, { wis } = {}) => Math.max(1, wis ?? 0) },
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Cleric_War", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Guiding Bolt", minLevel: 3, level: 1 },
        { name: "Magic Weapon", minLevel: 3, level: 2 },
        { name: "Shield of Faith", minLevel: 3, level: 1 },
        { name: "Spiritual Weapon", minLevel: 3, level: 2 },
        { name: "Crusader's Mantle", minLevel: 5, level: 3 },
        { name: "Spirit Guardians", minLevel: 5, level: 3 },
        { name: "Fire Shield", minLevel: 7, level: 4 },
        { name: "Freedom of Movement", minLevel: 7, level: 4 },
        { name: "Hold Monster", minLevel: 9, level: 5 },
        { name: "Steel Wind Strike", minLevel: 9, level: 5 },
      ],
    },
  });
}

registerSubclassSheetEffects("Cleric_War", [
  { type: "attackBonus", value: 10, minLevel: 3, note: "Guided Strike: add +10 to a missed attack roll using Channel Divinity." },
  { type: "resistance", damageTypes: ["Bludgeoning", "Piercing", "Slashing"], minLevel: 17, note: "Avatar of Battle." },
]);
// [SheetRuntime] END

}

