import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);


  registerFeatAdapter("Tough", function (feat) {
    return { ...feat, hpBonusPerLevel: 2 };
  });

}

