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
registerSpeciesAdapter("Dragonborn_XPHB", function (s) {
  let specs = getGenericSpeciesChoiceSpecs(s);
  // Draconic Resistance is determined by the ancestry choice; do not render a separate resistance choice.
  specs = specs.filter(function (x) { return !String(x.key || '').startsWith('species_resist'); });

  const fallbackAncestries = [
    'Black Dragon', 'Blue Dragon', 'Brass Dragon', 'Bronze Dragon', 'Copper Dragon',
    'Gold Dragon', 'Green Dragon', 'Red Dragon', 'Silver Dragon', 'White Dragon',
  ];
  const opts = [];

  if (Array.isArray(s._versions)) {
    s._versions.forEach(function (v) {
      if (v && v._abstract && Array.isArray(v._implementations)) {
        v._implementations.forEach(function (impl) {
          const vars = impl && impl._variables ? Object.values(impl._variables).filter(Boolean) : [];
          const label = vars[0] || impl?.name;
          if (label) opts.push({ key: impl?.name || label, label });
        });
      }
    });
  }

  fallbackAncestries.forEach(function (name) {
    if (!opts.some(function (opt) { return String(opt.label || opt.key).toLowerCase() === name.toLowerCase(); })) {
      opts.push({ key: name, label: name });
    }
  });

  specs.push({ key: 'species_version', label: 'Draconic Ancestry', type: 'option', options: opts, count: 1, level: 1 });
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Dragonborn_XPHB", {
  labels: {
    species_version: 'Draconic Ancestry',
  },
});
registerSpeciesSheetActions("Dragonborn_XPHB", [
  {
    name: 'Breath Weapon',
    icon: '',
    cat: 'action',
    uses: 'PB / LR',
    resKey: 'dragonborn_breath',
    rollers: [{ kind: 'damage', formula: ({ character }) => {
      const lv = Number(character?.level || 1);
      const dice = lv >= 17 ? 4 : lv >= 11 ? 3 : lv >= 5 ? 2 : 1;
      return `${dice}d10`;
    } }],
    inlinePills: ({ character }) => {
      const pb = Math.floor((Number(character?.level || 1) - 1) / 4) + 2;
      const conScore = character?.finalScores?.con ?? 10;
      const conMod = Math.floor((conScore - 10) / 2);
      return [{ icon: 'shield', label: 'Save DC', value: 8 + pb + conMod }];
    },
    minLevel: 1,
    desc: 'When you take the Attack action, you can replace one attack with destructive draconic energy in a 15 ft. cone or 30 ft. line. Each creature makes a DEX save (DC = 8 + PB + CON mod); half damage on success. Damage type depends on your Draconic Ancestry.',
  },
  {
    name: 'Draconic Flight',
    icon: '',
    cat: 'bonus',
    uses: '1 / LR',
    resKey: 'dragonborn_flight',
    minLevel: 5,
    desc: 'Bonus Action: sprout spectral wings for 10 minutes, until you retract them with no action, or until you have the Incapacitated condition. During that time, you have a Fly Speed equal to your Speed. Recharge: Long Rest.',
  },
]);
registerSpeciesSheetResources("Dragonborn_XPHB", [
  {
    key: 'dragonborn_breath',
    name: 'Breath Weapon',
    icon: 'flame',
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
  {
    key: 'dragonborn_flight',
    name: 'Draconic Flight',
    icon: 'wing',
    recharge: 'LR',
    minLevel: 5,
    max: 1,
  },
]);

registerSpeciesSheetEffects("Dragonborn_XPHB", [
  {
    type: 'resistance-choice',
    key: 'species_version',
    map: {
      black: 'Acid',
      copper: 'Acid',
      blue: 'Lightning',
      bronze: 'Lightning',
      brass: 'Fire',
      gold: 'Fire',
      red: 'Fire',
      green: 'Poison',
      silver: 'Cold',
      white: 'Cold',
    },
    minLevel: 1,
    note: 'Draconic Resistance',
  },
]);

}
