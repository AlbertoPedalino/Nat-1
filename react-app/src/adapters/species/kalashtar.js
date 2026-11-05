import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSpeciesAdapter, registerSpeciesSheetCommonChoiceMeta, getGenericSpeciesChoiceSpecs } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Kalashtar_EFA", function (s) {
  return getGenericSpeciesChoiceSpecs(s);
});

registerSpeciesSheetCommonChoiceMeta("Kalashtar_EFA");

}

