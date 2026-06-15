import { createAdapterBindings } from '../adapterBindings.js';

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
function selectedSpeciesVersionIncludes(character, token) {
  const raw = character?.choices?.species_version
    ?? character?.normalizedChoices?.species?.options?.species_version
    ?? character?.normalizedChoices?.rawByKey?.species_version
    ?? '';
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || '').toLowerCase().includes(String(token || '').toLowerCase());
}

function requiresGiantAncestry(token) {
  return function (character) {
    return selectedSpeciesVersionIncludes(character, token);
  };
}

// Goliath XPHB: Giant Ancestry — scelta del tipo di gigante (determina resistenza e abilità)
registerSpeciesAdapter("Goliath_XPHB", function (s) {
  let specs = getGenericSpeciesChoiceSpecs(s);
  const ancestryOpts = [
    { key: "Cloud's Jaunt",    label: "Cloud Giant — Teleport (Intelligence)" },
    { key: "Fire's Burn",      label: "Fire Giant — Bonus Fire Damage (Strength)" },
    { key: "Frost's Chill",    label: "Frost Giant — Cold Damage + Slow (Constitution)" },
    { key: "Hill's Tumble",    label: "Hill Giant — Knock Prone (Strength)" },
    { key: "Stone's Endurance",label: "Stone Giant — Damage Reduction 1×/SR (Constitution)" },
    { key: "Storm's Thunder",  label: "Storm Giant — Bonus Thunder Damage (Strength)" },
  ];
  specs.push({ key: 'species_version', label: 'Giant Ancestry', type: 'option', options: ancestryOpts, count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Goliath_XPHB", {
  labels: {
    species_version: 'Giant Ancestry',
  },
});
registerSpeciesSheetActions("Goliath_XPHB", [
  {
    name: "Cloud's Jaunt",
    icon: '',
    cat: 'bonus',
    uses: 'PB / LR',
    resKey: 'goliath_giant_ancestry',
    minLevel: 1,
    condition: requiresGiantAncestry('cloud'),
    desc: 'Bonus Action: magically teleport up to 30 feet to an unoccupied space you can see. Uses are shared with your chosen Giant Ancestry benefit.',
  },
  {
    name: "Fire's Burn",
    icon: '',
    cat: 'action',
    uses: 'PB / LR',
    resKey: 'goliath_giant_ancestry',
    rollFormula: '1d10',
    minLevel: 1,
    condition: requiresGiantAncestry('fire'),
    desc: 'No action: when you hit a target with an attack roll and deal damage to it, also deal 1d10 Fire damage to that target. Uses are shared with your chosen Giant Ancestry benefit.',
  },
  {
    name: "Frost's Chill",
    icon: '',
    cat: 'action',
    uses: 'PB / LR',
    resKey: 'goliath_giant_ancestry',
    rollFormula: '1d6',
    minLevel: 1,
    condition: requiresGiantAncestry('frost'),
    desc: 'No action: when you hit a target with an attack roll and deal damage to it, also deal 1d6 Cold damage and reduce its Speed by 10 feet until the start of your next turn. Uses are shared with your chosen Giant Ancestry benefit.',
  },
  {
    name: "Hill's Tumble",
    icon: '',
    cat: 'action',
    uses: 'PB / LR',
    resKey: 'goliath_giant_ancestry',
    minLevel: 1,
    condition: requiresGiantAncestry('hill'),
    desc: 'No action: when you hit a Large or smaller creature with an attack roll and deal damage to it, give that target the Prone condition. Uses are shared with your chosen Giant Ancestry benefit.',
  },
  {
    name: "Stone's Endurance",
    icon: '',
    cat: 'reaction',
    uses: 'PB / LR',
    resKey: 'goliath_giant_ancestry',
    minLevel: 1,
    condition: requiresGiantAncestry('stone'),
    inlinePills: ({ character }) => {
      const conScore = character?.finalScores?.con ?? 10;
      const conMod = Math.floor((conScore - 10) / 2);
      return [{ icon: 'shield', label: 'Reduction', value: `1d12${conMod >= 0 ? '+' : ''}${conMod}` }];
    },
    desc: 'Reaction: when you take damage, roll 1d12, add your Constitution modifier, and reduce the damage by that total. Uses are shared with your chosen Giant Ancestry benefit.',
  },
  {
    name: "Storm's Thunder",
    icon: '',
    cat: 'reaction',
    uses: 'PB / LR',
    resKey: 'goliath_giant_ancestry',
    rollFormula: '1d8',
    minLevel: 1,
    condition: requiresGiantAncestry('storm'),
    desc: 'Reaction: when you take damage from a creature within 60 feet of you, deal 1d8 Thunder damage to that creature. Uses are shared with your chosen Giant Ancestry benefit.',
  },
  {
    name: 'Large Form',
    icon: '',
    cat: 'bonus',
    uses: '1 / LR',
    resKey: 'goliath_large_form',
    minLevel: 5,
    inlinePills: [
      { icon: 'timer', label: 'Duration', value: '10 min' },
      { icon: 'footprints', label: 'Speed', value: '+10 ft' },
    ],
    desc: 'Bonus Action: if you are in a big enough space, become Large for 10 minutes or until you end it with no action. For the duration, you have Advantage on Strength checks and your Speed increases by 10 feet. Recharge: Long Rest.',
  },
]);
registerSpeciesSheetResources("Goliath_XPHB", [
  {
    key: 'goliath_giant_ancestry',
    name: 'Giant Ancestry',
    icon: 'mountain',
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
  {
    key: 'goliath_large_form',
    name: 'Large Form',
    icon: 'maximize',
    recharge: 'LR',
    minLevel: 5,
    max: 1,
  },
]);

}

