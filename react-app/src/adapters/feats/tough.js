import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatAdapter } = createAdapterBindings(registry, context);

  if (typeof registerFeatAdapter !== "function") return;

  registerFeatAdapter("Tough", function (feat) {
    return { ...feat, hpBonusPerLevel: 2 };
  });

}

