import { createAdapterBindings } from '../adapterBindings.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

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
    inlinePills: ({ character }) => [{ label: 'Temp HP', value: 2 * getProficiencyBonus(character) }],
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
