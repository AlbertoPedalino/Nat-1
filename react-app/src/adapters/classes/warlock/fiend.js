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

function fiendChoice(C, key) {
  if (!C?.choices) return null;
  if (C.choices[key] != null) return C.choices[key];
  const found = Object.entries(C.choices).find(([choiceKey]) => choiceKey.replace(/^mc\d+_/, '') === key);
  return found ? found[1] : null;
}
registerSubclassAdapter("Warlock_Fiend", function (cls, lv, specs) {
  if (lv >= 10) {
    specs.push({
      key: "fiend_resilience_damage_type",
      label: "Fiendish Resilience — Damage Type",
      type: "generic_choice",
      from: ["Acid", "Bludgeoning", "Cold", "Fire", "Lightning", "Necrotic", "Piercing", "Poison", "Psychic", "Radiant", "Slashing", "Thunder"],
      count: 1,
      level: 10
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Warlock_Fiend", [

  { name: "Dark One's Own Luck", icon: "dice-6", cat: "reaction", uses: "CHA mod / LR", resKey: "fiend_luck", minLevel: 6,
    desc: "When you make an ability check or saving throw, expend one use to add 1d10 to the roll. You can do so after seeing the roll but before the outcome is determined. Recharge: Long Rest." },
  { name: "Fiendish Resilience", icon: "shield", cat: "action", uses: "Passive — change on rest", minLevel: 10,
  passive: true,
    inlinePills: ({ character }) => [{ icon: "shield", label: "Resistance", value: String(fiendChoice(character, "fiend_resilience_damage_type") || "Choose") }],
    desc: "You have Resistance to the chosen damage type. At the end of a Short or Long Rest, you can change the type. Select the type in the builder (or adjust manually if the builder choice doesn't support rest-based updates)." },
  { name: "Hurl Through Hell", icon: "flame", cat: "action", uses: "1 / LR or Pact Magic slot", resKey: "fiend_hurl", minLevel: 14,
    rollers: [{ kind: 'damage', formula: "8d10", label: "Hurl Through Hell 8d10 Psychic" }],
    desc: "When you hit a creature with an attack, banish it to the Lower Planes until the end of your next turn. When it returns, if it isn't a Fiend, it makes a CHA save or takes 8d10 Psychic damage and is Incapacitated until the end of its next turn; on success, half damage and no Incapacitated. Recharge: Long Rest, or expend a Pact Magic slot." },
]);
registerSubclassSheetEffects("Warlock_Fiend", [
  { type: "resistance-choice", key: "fiend_resilience_damage_type", minLevel: 10, note: "Fiendish Resilience" },
]);

registerSubclassSheetResources("Warlock_Fiend", [
  { key: "fiend_luck", name: "Dark One's Own Luck", icon: "dice-6", recharge: "LR",
    max: (lv, { cha } = {}) => Math.max(1, cha ?? 0) },
  { key: "fiend_hurl", name: "Hurl Through Hell", icon: "flame", recharge: "LR", max: () => 1 },
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Warlock_Fiend", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: 'Burning Hands', minLevel: 3, level: 1, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Command', minLevel: 3, level: 1, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Scorching Ray', minLevel: 3, level: 2, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Suggestion', minLevel: 3, level: 2, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Fireball', minLevel: 5, level: 3, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Stinking Cloud', minLevel: 5, level: 3, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Fire Shield', minLevel: 7, level: 4, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Wall of Fire', minLevel: 7, level: 4, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Geas', minLevel: 9, level: 5, source: 'Fiend', sourceType: 'subclass' },
        { name: 'Insect Plague', minLevel: 9, level: 5, source: 'Fiend', sourceType: 'subclass' }
      ],
    },
  });
}
// [SheetRuntime] END

}

