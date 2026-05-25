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
const _BANNERET_ENVOY_SKILLS = ['Insight', 'Intimidation', 'Persuasion', 'Performance'];

registerSubclassAdapter("Fighter_Banneret", function (cls, lv, specs) {
  if (lv >= 3) {
    specs.push({
      key: 'subclass_banneret_envoy_skill',
      label: 'Knightly Envoy — Well Spoken (Skill)',
      type: 'skill_choice',
      from: _BANNERET_ENVOY_SKILLS,
      count: 1,
      level: 3
    });
    specs.push({
      key: 'subclass_banneret_language',
      label: 'Knightly Envoy — Polyglot (Language)',
      type: 'language_choice',
      count: 1,
      level: 3
    });
  }
});

// [SheetRuntime] START
registerSubclassSheetActions("Fighter_Banneret", [
  {
    "name": "Knightly Envoy",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 3,
    "desc": "Comprehension: cast Comprehend Languages as a Ritual (CHA spellcasting). Polyglot: know one language; after a Long Rest, can swap for any language heard/seen/read in the past 24h. Well Spoken: proficiency in one of Insight, Intimidation, Persuasion, or Performance."
  },
  {
    "name": "Group Recovery",
    "icon": "",
    "cat": "action",
    "uses": "On Second Wind / SR",
    "passive": true,
    "minLevel": 3,
    "desc": "When you use Second Wind, choose up to CHA modifier (min 1) allies within 30 ft. Each chosen ally regains 1d4 + your Fighter level HP. Recharge: Short or Long Rest."
  },
  {
    "name": "Team Tactics",
    "icon": "",
    "cat": "action",
    "uses": "On Group Recovery",
    "passive": true,
    "minLevel": 7,
    "desc": "When you use Group Recovery, each chosen ally has Advantage on D20 Tests until the start of your next turn."
  },
  {
    "name": "Rallying Surge",
    "icon": "",
    "cat": "action",
    "uses": "On Action Surge",
    "passive": true,
    "minLevel": 10,
    "desc": "When you use Action Surge, choose up to CHA modifier (min 1) allies within 30 ft. Each can immediately use a Reaction to either: Attack (one weapon or Unarmed Strike), or Move (half Speed, no Opportunity Attacks)."
  },
  {
    "name": "Shared Resilience",
    "icon": "",
    "cat": "reaction",
    "uses": "1 Indomitable",
    "minLevel": 15,
    "desc": "Reaction when an ally within 60 ft fails a saving throw: expend one use of Indomitable. The ally rerolls with a bonus equal to your Fighter level and must use the new roll."
  },
  {
    "name": "Inspiring Commander",
    "icon": "",
    "cat": "action",
    "uses": "Passive",
    "passive": true,
    "minLevel": 18,
    "desc": "Bolstered Rally: Group Recovery and Rallying Surge areas expand to 60 ft Emanation. Unshakable Bravery: you have Immunity to the Charmed and Frightened conditions."
  }
]);

registerSubclassSheetEffects("Fighter_Banneret", [

  { type: "healingSideEffect", minLevel: 3, note: "Rallying Cry: when you use Second Wind, allies regain HP." },
  { type: "skillExpertise", values: ["Persuasion"], minLevel: 7, note: "Royal Envoy." },
  { type: "reactionAttackGrant", minLevel: 10, note: "Inspiring Surge: when you Action Surge, ally can make one weapon attack." },
]);
// [SheetRuntime] END

}

