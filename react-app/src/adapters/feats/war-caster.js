import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Advantage on CON saves to maintain Concentration.
  registerFeatSheetEffects("War Caster", [
    { type: "advantage", target: "save", source: "Concentration", note: "War Caster" },
  ]);
}

