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
  const getMod = context?.getMod;
  const getFinal = context?.getFinal;
registerSubclassAdapter("Warlock_Celestial", function (cls, lv, specs) {});

// [SheetRuntime] START
registerSubclassSheetActions("Warlock_Celestial", [
  { name: "Healing Light", icon: "sun", cat: "bonus", uses: "Pool / LR", resKey: "celestial_heal_light", minLevel: 3,
    rollers: [{ kind: 'heal', formula: "1d6" }],
    desc: "Bonus Action: expend one or more d6s from your Healing Light pool to restore HP to one creature within 60 ft. Max dice per use = CHA modifier (minimum 1). Pool = 1 + Warlock level. Recharge: Long Rest." },
  { name: "Radiant Soul", icon: "sun", cat: "action", uses: "Passive", minLevel: 6,
  passive: true,
    inlinePills: ({ character }) => {
      const cha = typeof getMod === "function" && typeof getFinal === "function"
        ? Number(getMod(getFinal(character, "cha")) || 0) : 0;
      return [{ icon: "sun", label: "Radiant/Fire spell bonus", value: Math.max(1, cha) }];
    },
    desc: "You have Resistance to Radiant damage. When you cast a spell that deals Radiant or Fire damage, add your CHA modifier to one damage roll of that spell." },
  { name: "Celestial Resilience", icon: "shield", cat: "action", uses: "Short/Long Rest or Magical Cunning", minLevel: 10,
    inlinePills: ({ ownerLevel, character }) => {
      const lv = Number(ownerLevel || 1);
      const cha = typeof getMod === "function" && typeof getFinal === "function"
        ? Number(getMod(getFinal(character, "cha")) || 0) : 0;
      return [
        { icon: "shield", label: "Self THP", value: Math.max(1, lv + cha) },
        { icon: "users", label: "Ally THP", value: Math.max(1, Math.floor(lv / 2) + cha) },
      ];
    },
    desc: "When you finish a Short or Long Rest, or when you use Magical Cunning, you gain Temporary HP equal to Warlock level + CHA modifier. Up to five creatures within 10 ft gain Temporary HP equal to half Warlock level + CHA modifier." },
  { name: "Searing Vengeance", icon: "flame", cat: "reaction", uses: "1 / LR", resKey: "celestial_searing_ven", minLevel: 14,
    rollers: [{ kind: 'damage', formula: "2d8", label: "Searing Vengeance 2d8 Radiant" }],
    desc: "When you or an ally within 60 ft is about to make a Death Saving Throw, the creature regains HP equal to half its HP maximum and can stand if Prone. Each creature of your choice within 30 ft takes 2d8 Radiant damage + CHA modifier and is Blinded until the end of the current turn. Recharge: Long Rest." },
]);

registerSubclassSheetEffects("Warlock_Celestial", [
  { type: "resistance", damageTypes: ["Radiant"], minLevel: 6, note: "Radiant Soul" },
]);
registerSubclassSheetResources("Warlock_Celestial", [
  { key: "celestial_heal_light", name: "Healing Light", icon: "sun",   recharge: "LR",
    max: (lv) => 1 + lv,
    pool: true, track: "used" },
  { key: "celestial_searing_ven", name: "Searing Vengeance", icon: "flame", recharge: "LR", max: () => 1 },
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Warlock_Celestial", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: 'Aid', minLevel: 3, level: 2, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Cure Wounds', minLevel: 3, level: 1, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Guiding Bolt', minLevel: 3, level: 1, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Lesser Restoration', minLevel: 3, level: 2, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Light', minLevel: 3, level: 0, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Sacred Flame', minLevel: 3, level: 0, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Daylight', minLevel: 5, level: 3, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Revivify', minLevel: 5, level: 3, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Guardian of Faith', minLevel: 7, level: 4, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Wall of Fire', minLevel: 7, level: 4, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Greater Restoration', minLevel: 9, level: 5, source: 'Celestial', sourceType: 'subclass' },
        { name: 'Summon Celestial', minLevel: 9, level: 5, source: 'Celestial', sourceType: 'subclass' }
      ],
    },
  });
}
// [SheetRuntime] END

}

