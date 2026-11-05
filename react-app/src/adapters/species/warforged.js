import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetEffects,
    registerSpeciesSheetCommonChoiceMeta,
    getGenericSpeciesChoiceSpecs,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Warforged_EFA", function (s) {
  return getGenericSpeciesChoiceSpecs(s);
});

registerSpeciesSheetCommonChoiceMeta("Warforged_EFA");
registerSpeciesSheetEffects("Warforged_EFA", [
  {
    type: 'acBonus',
    value: 1,
    minLevel: 1,
    note: 'Integrated Protection',
  },
  // Constructed Resilience: Advantage on saves against being Poisoned.
  { type: 'advantage', target: 'save', conditions: ['Poisoned'], minLevel: 1, note: 'Constructed Resilience' },
]);

}

