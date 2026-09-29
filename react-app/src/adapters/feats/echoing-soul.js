import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatAdapter,
    registerFeatSheetActions,
  } = createAdapterBindings(registry, context);

  if (typeof registerFeatAdapter === 'function') {
    registerFeatAdapter('Echoing Soul', function (feat) {
      return {
        ...feat,
        skillProficiencies: [{ any: 2 }],
        expertise: [{ anyProficientSkill: 1 }],
      };
    });
  }

  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Echoing Soul', []);
  }
}
