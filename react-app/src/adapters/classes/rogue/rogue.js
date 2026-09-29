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
    getWeaponMasteryChoiceCount,
    getWeaponMasteryChoiceNames,
    WEAPON_MASTERY_RULES,
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
registerClassAdapter("Rogue", function (cls, lv, specs, ctx = {}) {
  const expertiseFrom = typeof SKILLS !== 'undefined'
    ? SKILLS.map(function (s) { return s.n; }).concat(["Thieves' Tools"])
    : ["Thieves' Tools"];
  const weapons = getWeaponMasteryChoiceNames(ctx.items, allItemsDb, WEAPON_MASTERY_RULES.rogue);

  if (lv >= 1) {
    specs.push({
      key: 'rogue_expertise_lv1',
      label: 'Expertise (Rogue Lv.1)',
      type: 'expertise',
      from: expertiseFrom,
      count: 2,
      level: 1,
      requiresProficiency: true
    });
    specs.push({
      key: 'rogue_weapon_mastery',
      label: 'Weapon Mastery (Rogue)',
      type: 'generic_choice',
      from: weapons,
      count: getWeaponMasteryChoiceCount('rogue', lv),
      level: 1
    });
  }
  if (lv >= 6) {
    specs.push({
      key: 'rogue_expertise_lv6',
      label: 'Expertise (Rogue Lv.6)',
      type: 'expertise',
      from: expertiseFrom,
      count: 2,
      level: 6,
      requiresProficiency: true
    });
  }
  if (lv >= 19) {
    specs.push({ key: 'rogue_epic_boon', label: 'Epic Boon', type: 'feat_cat', categories: ['EB'], count: 1, level: 19 });
  }
});

// [SheetRuntime] START
registerClassSheetActions("Rogue", [
  {
    "name": "Sneak Attack",
    "icon": "",
    "cat": "attack",
    "uses": "1 / turn",
    rollers: [{ kind: 'damage', formula: ({ ownerLevel }) => {
      const lv = Number(ownerLevel || 1);
      const dice = Math.max(1, Math.ceil(lv / 2));
      return `${dice}d6`;
    }, label: ({ formula }) => `${String(formula || '')} extra` }],
    "rollLabelPrefix": "Damage"
  },
  {
    "name": "Cunning Action",
    "icon": "",
    "cat": "bonus",
    "uses": "Unlimited",
    "minLevel": 2
  },
  {
    "name": "Steady Aim",
    "icon": "",
    "cat": "bonus",
    "uses": "Unlimited",
    "minLevel": 3
  },
  {
    "name": "Uncanny Dodge",
    "icon": "",
    "cat": "reaction",
    "uses": "Reaction",
    "minLevel": 5
  },
  {
    "name": "Cunning Strike",
    "icon": "",
    "cat": "attack",
    "uses": "Sneak Attack die",
    "minLevel": 5
  },
  {
    "name": "Improved Cunning Strike",
    "icon": "",
    "cat": "attack",
    "uses": "Sneak Attack dice",
    "minLevel": 11
  },
  {
    "name": "Devious Strikes",
    "icon": "",
    "cat": "attack",
    "uses": "Sneak Attack dice",
    "minLevel": 14
  },
  {
    "name": "Stroke of Luck",
    "icon": "",
    "cat": "action",
    "uses": "1 / LR",
    "resKey": "stroke_of_luck",
    "minLevel": 20
  }
]);
registerClassSheetResources("Rogue", [
  {
    "key": "stroke_of_luck",
    "name": "Stroke of Luck",
    "icon": "star",
    "recharge": "LR",
    "max": () => 1
  }
]);
registerClassSheetProficiencies("Rogue", [
  {
    type: "weapon",
    values: ["Martial weapons with Finesse or Light property"],
    match: { category: "martial", propertiesAny: ["F", "L"] },
    display: false,
    minLevel: 1
  },
  { type: "language", values: ["Thieves' Cant"], minLevel: 1 }
]);
// [SheetRuntime] END

}
