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
// Light Domain (XPHB): tutte le feature sono passive, nessuna scelta di build.
// L3: Warding Flare, Radiance of the Dawn (CD)
// L6: Improved Warding Flare
// L17: Corona of Light
registerSubclassAdapter("Cleric_Light", function (cls, lv, specs) {
  // nessuna spec
});

// [SheetRuntime] START
registerSubclassSheetActions("Cleric_Light", [
  { name: "Warding Flare", icon: "", cat: "reaction", uses: "WIS mod / LR", resKey: "warding_flare", minLevel: 3,
    desc: "Reaction when you are attacked by a creature within 30 ft that you can see: impose Disadvantage on that attack roll, causing light to flare. A creature that can't be Blinded is immune. Uses = WIS modifier (min 1) per Long Rest." },
  { name: "Improved Warding Flare", icon: "", cat: "reaction", uses: "WIS mod / SR+LR", resKey: "warding_flare", minLevel: 6,
    desc: "Warding Flare now recharges on Short or Long Rest. Additionally, you can now use Warding Flare when a creature within 30 ft that you can see attacks a creature other than you." },
  { name: "Radiance of the Dawn", icon: "", cat: "action", uses: "1 Channel", resKey: "channel_div",
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      return `2d10+${lv}`;
    }, label: ({ formula }) => `${formula} radiant` }],
    desc: "Magic action: emit a flash of light in a 30-ft Emanation from yourself. Any magical Darkness in the area is dispelled. Each creature of your choice in the area must make a CON save or take 2d10 + Cleric level Radiant damage (half on success)." },
  { name: "Corona of Light", icon: "", cat: "action", uses: "WIS mod / LR", resKey: "corona_light", minLevel: 17,
    desc: "Activate an aura of sunlight for 1 minute or until you dismiss it using another action. Emit Bright Light in a 60-ft radius and Dim Light for an additional 30 ft. Enemies in the Bright Light have Disadvantage on saving throws against any spell that deals Fire or Radiant damage." },
]);
registerSubclassSheetResources("Cleric_Light", [
  { key: "warding_flare", name: "Warding Flare", icon: "sun", recharge: "SR", srMinLevel: 6,
    max: (lv, { wis } = {}) => Math.max(1, wis ?? 0) },
  { key: "corona_light", name: "Corona of Light", icon: "sun", recharge: "LR",
    max: (lv, { wis } = {}) => lv >= 17 ? Math.max(1, wis ?? 0) : 0 },
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Cleric_Light", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Burning Hands", minLevel: 3, level: 1 },
        { name: "Faerie Fire", minLevel: 3, level: 1 },
        { name: "Scorching Ray", minLevel: 3, level: 2 },
        { name: "See Invisibility", minLevel: 3, level: 2 },
        { name: "Daylight", minLevel: 5, level: 3 },
        { name: "Fireball", minLevel: 5, level: 3 },
        { name: "Arcane Eye", minLevel: 7, level: 4 },
        { name: "Wall of Fire", minLevel: 7, level: 4 },
        { name: "Flame Strike", minLevel: 9, level: 5 },
        { name: "Scrying", minLevel: 9, level: 5 },
      ],
    },
  });
}

registerSubclassSheetEffects("Cleric_Light", [

  { type: "reactionDefense", key: "warding_flare", minLevel: 3, note: "Warding Flare: impose Disadvantage on an attack within 30 ft." },
  { type: "reactionDefense", key: "warding_flare", minLevel: 6, note: "Improved Warding Flare: can also protect allies." },
  { type: "aura", key: "corona_light", minLevel: 17, note: "Corona of Light: enemies in bright light have Disadvantage on saves against Fire/Radiant spells." },
]);
// [SheetRuntime] END

}

