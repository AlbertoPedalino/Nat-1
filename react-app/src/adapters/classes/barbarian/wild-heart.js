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
registerSubclassAdapter("Barbarian_Wild Heart", function (cls, lv, specs) {
  if (lv >= 6) {
    specs.push({
      key: 'subclass_wild_heart_aspect',
      label: 'Aspect of the Wilds (Wild Heart lv.6)',
      type: 'generic_choice',
      from: ['Owl', 'Panther', 'Salmon'],
      count: 1,
      level: 6
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Barbarian_Wild Heart", [
  {
    name: "Animal Speaker",
    icon: "",
    cat: "action",
    uses: "Ritual",
    minLevel: 3,
    desc: "You can cast Beast Sense and Speak with Animals, but only as Rituals (no spell slot required, 10 minutes each)."
  },
  {
    name: "Rage of the Wilds",
    icon: "",
    cat: "bonus",
    uses: "Choose per Rage",
    minLevel: 3,
    desc: "When you activate your Rage, choose one — Bear: Resistance to all damage except Force, Necrotic, Psychic, and Radiant; Eagle: take Disengage + Dash as part of the Rage Bonus Action; while Raging, can Bonus Action to take both Disengage and Dash; Wolf: your allies have Advantage on attack rolls against any enemy within 5 ft of you."
  },
  {
    name: "Aspect of the Wilds",
    icon: "",
    cat: "action",
    uses: "Passive (change on LR)",
    passive: true,
    minLevel: 6,
    desc: "Choose a permanent trait (can change after each Long Rest) — Owl: Darkvision 60 ft (or +60 ft if already have it); Panther: Climb Speed = walking Speed; Salmon: Swim Speed = walking Speed."
  },
  {
    name: "Nature Speaker",
    icon: "",
    cat: "action",
    uses: "Ritual / LR",
    minLevel: 10,
    desc: "You can cast Commune with Nature as a Ritual. You always have this spell prepared; it doesn't count against the number of spells you can prepare."
  },
  {
    name: "Power of the Wilds",
    icon: "",
    cat: "bonus",
    uses: "Choose per Rage",
    minLevel: 14,
    desc: "When you activate your Rage, also choose one — Falcon: Fly Speed = walking Speed (while not wearing armor); Lion: enemies within 5 ft have Disadvantage on attack rolls against targets other than you or another Barbarian with this option; Ram: when you hit a Large or smaller creature with a melee attack, you can knock it Prone."
  }
]);
if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Barbarian_Wild Heart", {
    spellcasting: {
      ability: "wis",
      alwaysPreparedSpells: [
        { name: "Commune with Nature", minLevel: 10, level: 5 },
      ],
    },
  });
}

registerSubclassSheetEffects("Barbarian_Wild Heart", [
  { type: "passiveNote", minLevel: 3, note: "Rage of the Wilds: Bear → Resistance to all damage except Psychic while raging. Eagle/Wolf grant utility, not damage resistance." },
  { type: "mobility", minLevel: 6, note: "Aspect of the Wilds: animal aspect utility." },
  { type: "rageAura", minLevel: 14, note: "Power of the Wilds: enhanced rage aspect." },
]);
// [SheetRuntime] END

}

