import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter, registerFeatSheetActions } = createAdapterBindings(registry, context);

  registerFeatAdapter('Echoing Soul', function (feat) {
    return {
      ...feat,
      skillProficiencies: [{ any: 2 }],
      expertise: [{ anyProficientSkill: 1 }],
    };
  });

  registerFeatSheetActions('Echoing Soul', []);
}
