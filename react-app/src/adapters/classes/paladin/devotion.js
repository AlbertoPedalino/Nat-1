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
registerSubclassAdapter("Paladin_Devotion", function (cls, lv, specs) {});

// [SheetRuntime] START
registerSubclassSheetActions("Paladin_Devotion", [
  { name: "Channel: Sacred Weapon", icon: "", cat: "action", uses: "1 Channel", resKey: "paladin_channel_div",
    desc: "When you take the Attack action, expend one use of Channel Divinity to imbue one melee weapon you're holding. For 10 minutes or until you use this feature again: add your CHA modifier (min +1) to attack rolls with that weapon; each hit deals its normal damage type or Radiant damage (your choice per hit); emits Bright Light 20 ft and Dim Light 20 ft beyond. You can end this early (no action). Ends if you aren't carrying the weapon." },
  { name: "Aura of Devotion", icon: "", cat: "action", uses: "Passive", minLevel: 7,
  passive: true,
    desc: "While conscious, you and friendly creatures within your Aura of Protection have Immunity to the Charmed condition. If a Charmed ally enters the aura, that condition has no effect on them while there. Range: 10 ft (30 ft at lv.18)." },
  { name: "Smite of Protection", icon: "", cat: "action", uses: "Passive", minLevel: 15,
  passive: true,
    desc: "Whenever you cast Divine Smite, you and your allies have Half Cover while in your Aura of Protection until the start of your next turn." },
  { name: "Holy Nimbus", icon: "", cat: "bonus", uses: "1 / LR or lv5 slot", resKey: "devotion_holy_nimbus", minLevel: 20,
    inlinePills: ({ ownerLevel, character }) => {
      const cha = typeof getMod === "function" && typeof getFinal === "function"
        ? Number(getMod(getFinal(character, "cha")) || 0) : 0;
      const pb = Math.floor((Number(character?.level || 1) - 1) / 4) + 2;
      return [{ icon: "sun", label: "Radiant/turn", value: cha + pb }];
    },
    desc: "Bonus Action: imbue your Aura of Protection with holy power for 10 minutes (no action to end). Three benefits — Holy Ward: Advantage on saving throws forced by Fiends or Undead; Radiant Damage: enemies starting their turn in the aura take Radiant damage equal to your CHA modifier + Proficiency Bonus; Sunlight: the aura is filled with Bright Light that is sunlight. Recharge: LR, or expend a level 5 spell slot." },
]);
registerSubclassSheetResources("Paladin_Devotion", [
  { key: "devotion_holy_nimbus", name: "Holy Nimbus", icon: "sun", recharge: "LR", max: () => 1 },
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Paladin_Devotion", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Protection from Evil and Good", minLevel: 3, level: 1 },
        { name: "Shield of Faith", minLevel: 3, level: 1 },
        { name: "Aid", minLevel: 5, level: 2 },
        { name: "Zone of Truth", minLevel: 5, level: 2 },
        { name: "Beacon of Hope", minLevel: 9, level: 3 },
        { name: "Dispel Magic", minLevel: 9, level: 3 },
        { name: "Freedom of Movement", minLevel: 13, level: 4 },
        { name: "Guardian of Faith", minLevel: 13, level: 4 },
        { name: "Commune", minLevel: 17, level: 5 },
        { name: "Flame Strike", minLevel: 17, level: 5 }
      ],
    },
  });
}

registerSubclassSheetEffects("Paladin_Devotion", [

  { type: "aura", key: "holy_nimbus", minLevel: 20, note: "Holy Nimbus: bright sunlight aura; enemies in aura take Radiant damage and have Disadvantage against relevant saves while active." },

]);
// [SheetRuntime] END

}

