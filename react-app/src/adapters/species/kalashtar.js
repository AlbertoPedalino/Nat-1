import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerSpeciesAdapter, registerSpeciesSheetCommonChoiceMeta } = createAdapterBindings(registry, context);

registerSpeciesSheetCommonChoiceMeta("Kalashtar_EFA");

}

