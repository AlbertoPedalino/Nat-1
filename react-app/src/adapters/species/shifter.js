import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesSheetActions,
    registerSpeciesSheetResources,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
// The lineage pick comes from the species' versions (speciesVersionChoiceSpec).
registerSpeciesSheetCommonChoiceMeta("Shifter_EFA", {
  labels: {
    species_version: 'Shifter Lineage',
  },
});
registerSpeciesSheetActions("Shifter_EFA", [
  {
    name: 'Shift',
    cat: 'bonus',
    resKey: 'shifter_shift',
    minLevel: 1,
  },
]);
registerSpeciesSheetResources("Shifter_EFA", [
  {
    key: 'shifter_shift',
    name: 'Shift',
    recharge: 'LR',
    max: 'proficiencyBonus',
  },
]);


}
