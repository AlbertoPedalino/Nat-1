import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);

  registerFeatAdapter('Echoing Soul', function (feat) {
    return {
      ...feat,
      skillProficiencies: [{ any: 2 }],
      expertise: [{ anyProficientSkill: 1 }],
    };
  });

}
