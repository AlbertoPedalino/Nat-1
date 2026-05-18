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
registerSpeciesAdapter("Shifter_EFA", function (s) {
  const specs = getGenericSpeciesChoiceSpecs(s);
  const fallbackLineages = ['Beasthide', 'Longtooth', 'Swiftstride', 'Wildhunt'];
  let opts = [];

  if (Array.isArray(s._versions) && s._versions.length) {
    opts = s._versions.map(v => ({
      key: v.name,
      label: String(v.name || '').includes(';')
        ? String(v.name).split(';')[1].trim()
        : v.name,
    })).filter(function (opt) { return opt.key && opt.label; });
  }

  fallbackLineages.forEach(function (name) {
    if (!opts.some(function (opt) { return String(opt.label || opt.key).toLowerCase() === name.toLowerCase(); })) {
      opts.push({ key: name, label: name });
    }
  });

  specs.push({
    key: 'species_version',
    label: 'Shifter Lineage',
    type: 'option',
    options: opts,
    count: 1,
    level: 1,
  });

  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Shifter_EFA", {
  labels: {
    species_version: 'Shifter Lineage',
  },
});
registerSpeciesSheetActions("Shifter_EFA", [
  {
    name: 'Shift',
    icon: '',
    cat: 'bonus',
    uses: 'PB / LR',
    resKey: 'shifter_shift',
    minLevel: 1,
    inlinePills: ({ character }) => {
      const lv = Number(character?.level || 1);
      const pb = Math.floor((lv - 1) / 4) + 2;
      return [{ icon: 'heart', label: 'Temp HP', value: 2 * pb }];
    },
    desc: 'Bonus Action: shift for 1 minute or until you revert as a Bonus Action. When you shift, gain temporary hit points equal to 2 times your Proficiency Bonus, plus lineage-specific benefits.',
  },
]);
registerSpeciesSheetResources("Shifter_EFA", [
  {
    key: 'shifter_shift',
    name: 'Shift',
    icon: 'moon',
    recharge: 'LR',
    max: (lv) => Math.floor((Number(lv) - 1) / 4) + 2,
  },
]);

}
