import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Advantage on saves against spells cast by creatures within 5 ft.
  registerFeatSheetEffects("Mage Slayer", [
    { type: "advantage", target: "save", source: "spells", note: "Mage Slayer" },
  ]);
}

