import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerSpeciesAdapter,
    registerSpeciesSheetActions,
    registerSpeciesSheetCommonChoiceMeta,
  } = createAdapterBindings(registry, context);
registerSpeciesAdapter("Changeling_EFA", function (s) {
  const specs = [];
  const instincts = specs.find(function (spec) { return spec.key === 'species_skill_0'; });
  if (instincts && Array.isArray(instincts.from) && !instincts.from.some(function (name) {
    return String(name || '').toLowerCase() === 'performance';
  })) {
    instincts.from = [...instincts.from, 'Performance'];
  }
  return specs;
});

registerSpeciesSheetCommonChoiceMeta("Changeling_EFA");
registerSpeciesSheetActions("Changeling_EFA", [
  {
    name: 'Shape-Shifter',
    cat: 'action',
    minLevel: 1,
  },
]);

}

