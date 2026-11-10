import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetEffects } = createAdapterBindings(registry, context);

  // Tough (XPHB 2024): +2 HP per character level.
  registerFeatSheetEffects("Tough", [
    { type: 'hpBonus', perLevel: 2, minLevel: 1, note: 'Tough' },
  ]);
}
