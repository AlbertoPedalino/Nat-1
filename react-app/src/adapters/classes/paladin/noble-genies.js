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
registerSubclassAdapter("Paladin_Noble Genies", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_noble_genies_skill',
      label: "Genie's Splendor — Skill Proficiency",
      type: 'skill_choice',
      from: ['Acrobatics', 'Intimidation', 'Performance', 'Persuasion'],
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Paladin_Noble Genies", [
  {
    "name": "Genie's Splendor",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Passive: while you aren't wearing armor, your AC equals 10 + DEX modifier + CHA modifier (shield still applies). You gain proficiency in one skill of your choice from Acrobatics, Intimidation, Performance, or Persuasion."
  },
  {
    "name": "Channel: Elemental Smite",
    "icon": "flame",
    "cat": "action",
    "uses": "1 Channel",
    "resKey": "paladin_channel_div",
    "minLevel": 3,
    "desc": "Immediately after you deal Divine Smite damage, expend one use of Channel Divinity to choose one elemental effect.",
    "subOptions": [
      { "name": "Dao's Crush", "icon": "hand", "desc": "The target is Grappled (escape DC = spell save DC) and Restrained while Grappled." },
      { "name": "Djinni's Escape", "icon": "move", "desc": "Teleport up to 30 ft to an unoccupied space you can see. Until end of your next turn you are semi-incorporeal (Resistance to Bludgeoning/Piercing/Slashing; immune to Grappled/Prone/Restrained)." },
      { "name": "Efreeti's Fury", "icon": "flame", "desc": "Deal an extra 2d4 Fire damage to the target, and deal 2d4 Fire damage to one creature of your choice within 30 ft of the target.", "rollFormula": "2d4", "rollButtonLabel": "2d4 fire" },
      { "name": "Marid's Surge", "icon": "waves", "desc": "Each creature within a 10-ft Emanation of the target must succeed on a STR saving throw (spell save DC) or be pushed up to 15 ft from the target and knocked Prone." }
    ]
  },
  {
    "name": "Aura of Elemental Shielding",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 7,
    "desc": "Passive: at the start of each of your turns (no action required), choose one damage type: Acid, Cold, Fire, Lightning, or Thunder. You and friendly creatures within your Aura of Protection gain Resistance to that damage type until the start of your next turn."
  },
  {
    "name": "Elemental Rebuke",
    "icon": "",
    "cat": "reaction",
    "uses": "CHA mod / LR",
    "resKey": "noble_genies_rebuke",
    "minLevel": 15,
    "rollFormula": "2d10",
    "rollButtonLabel": ({ formula }) => `${formula} + CHA elemental`,
    "rollKind": "damage",
    "desc": "Reaction when you are hit by an attack: halve the damage you take (round down). The attacker must then make a DEX saving throw (spell save DC). On a failed save, the attacker takes 2d10 + CHA modifier elemental damage (Acid, Cold, Fire, Lightning, or Thunder — your choice); on a success, it takes half that damage. Uses: CHA modifier (min 1) per Long Rest."
  },
  {
    "name": "Noble Scion",
    "icon": "",
    "cat": "bonus",
    "uses": "1 / LR",
    "resKey": "noble_genies_scion",
    "minLevel": 20,
    "desc": "Bonus Action: for 10 minutes (or until you use this feature again), assume the form of a Noble Genie. 1/LR, or expend a level 5+ spell slot. Benefits: Flight — you gain a Fly Speed of 60 ft with the Hover property. Minor Wish — when you or a creature within your Aura of Protection fails a D20 Test, you can use your Reaction to cause the roll to succeed instead."
  }
]);
registerSubclassSheetResources("Paladin_Noble Genies", [
  {
    "key": "noble_genies_rebuke",
    "name": "Elemental Rebuke",
    "icon": "zap",
    "recharge": "LR",
    "minLevel": 15,
    "max": (lv, { cha } = {}) => Math.max(1, cha ?? 0)
  },
  {
    "key": "noble_genies_scion",
    "name": "Noble Scion",
    "icon": "crown",
    "recharge": "LR",
    "minLevel": 20,
    "max": () => 1
  }
]);

if (typeof registerSubclassRuntimeConfig === "function") {
  registerSubclassRuntimeConfig("Paladin_Noble Genies", {
    spellcasting: {
      alwaysPreparedSpells: [
        { name: "Chromatic Orb", minLevel: 3, level: 1 },
        { name: "Elementalism", minLevel: 3, level: 0 },
        { name: "Thunderous Smite", minLevel: 3, level: 1 },
        { name: "Mirror Image", minLevel: 5, level: 2 },
        { name: "Phantasmal Force", minLevel: 5, level: 2 },
        { name: "Fly", minLevel: 9, level: 3 },
        { name: "Gaseous Form", minLevel: 9, level: 3 },
        { name: "Conjure Minor Elementals", minLevel: 13, level: 4 },
        { name: "Summon Elemental", minLevel: 13, level: 4 },
        { name: "Banishing Smite", minLevel: 17, level: 5 },
        { name: "Contact Other Plane", minLevel: 17, level: 5 }
      ],
    },
  });
}

registerSubclassSheetEffects("Paladin_Noble Genies", [
  { type: "acFormula", key: "paladin_noble_genies_genies_splendor", label: "Genie's Splendor", base: 10, abilities: ["dex", "cha"], allowShield: true, requiresNoArmor: true, minLevel: 3 },
]);
// [SheetRuntime] END

}

