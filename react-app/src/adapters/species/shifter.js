import { createAdapterBindings } from '../adapterBindings.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';
import { buildLineageOptions } from './lineageOptions.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
    getGenericSpeciesChoiceSpecs,
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
    inlinePills: ({ character }) => [{ icon: 'heart', label: 'Temp HP', value: 2 * getProficiencyBonus(character) }],
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


}
