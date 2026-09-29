import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Origin feat. Hypervigilance is passive (reroll Initiative if 9 or lower);
  // Steel Yourself is a 1/LR Reaction.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Survivor', [
      {
        name: 'Steel Yourself',
        icon: 'shield',
        cat: 'reaction',
        uses: '1 / LR',
        resKey: 'survivor_steel',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Survivor', [
      {
        key: 'survivor_steel',
        name: 'Steel Yourself',
        icon: 'shield',
        recharge: 'LR',
        max: 1,
      },
    ]);
  }
}
