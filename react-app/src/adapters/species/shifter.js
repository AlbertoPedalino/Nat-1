import { createAdapterBindings } from '../adapterBindings.js';
import { buildLineageOptions } from './lineageOptions.js';

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
// Canonical lineage tokens — single source for both the choice options
// (validated against _versions via `expect`) and the requiredChoice predicates.
const SHIFTER_LINEAGE = { BEASTHIDE: 'Beasthide', LONGTOOTH: 'Longtooth', SWIFTSTRIDE: 'Swiftstride', WILDHUNT: 'Wildhunt' };

registerSpeciesAdapter("Shifter_EFA", function (s) {
  const specs = getGenericSpeciesChoiceSpecs(s);
  const lineageOptions = buildLineageOptions(s._versions, { parentName: 'Shifter', expect: Object.values(SHIFTER_LINEAGE) });

  specs.push({
    key: 'species_version',
    label: 'Shifter Lineage',
    type: 'option',
    options: lineageOptions,
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
    max: 'proficiencyBonus',
  },
]);

registerSpeciesSheetEffects("Shifter_EFA", [
  {
    type: 'reminder',
    minLevel: 1,
    note: 'Beasthide (while shifted): +1d6 extra Temporary Hit Points on Shift, +1 AC.',
    requiredChoice: { key: 'species_version', value: SHIFTER_LINEAGE.BEASTHIDE },
  },
  {
    type: 'reminder',
    minLevel: 1,
    note: 'Longtooth (while shifted): on Shift and as a Bonus Action on other turns, make an Unarmed Strike with elongated fangs; on hit, deal 1d6 + STR Piercing damage.',
    requiredChoice: { key: 'species_version', value: SHIFTER_LINEAGE.LONGTOOTH },
  },
  {
    type: 'reminder',
    minLevel: 1,
    note: 'Swiftstride (while shifted): Speed +10 ft; once per round move up to 10 ft as a Reaction when a creature ends its turn within 5 ft (no Opportunity Attacks provoked).',
    requiredChoice: { key: 'species_version', value: SHIFTER_LINEAGE.SWIFTSTRIDE },
  },
  {
    type: 'reminder',
    minLevel: 1,
    note: 'Wildhunt (while shifted): Advantage on Wisdom checks; no creature within 30 ft can have Advantage on attack rolls against you unless you are Incapacitated.',
    requiredChoice: { key: 'species_version', value: SHIFTER_LINEAGE.WILDHUNT },
  },
]);

}
