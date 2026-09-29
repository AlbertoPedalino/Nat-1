import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const {
    registerFeatSheetActions,
    registerFeatSheetResources,
  } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Mist Walk is a limited-use Reaction teleport; Domain
  // Traveler and Poisoned Roots are narrative/DM-facing and not tracked here.
  if (typeof registerFeatSheetActions === 'function') {
    registerFeatSheetActions('Mist Walker', [
      {
        name: 'Mist Walk',
        icon: 'wind',
        cat: 'reaction',
        uses: 'PB / LR',
        resKey: 'mist_walker_walk',
      },
    ]);
  }

  if (typeof registerFeatSheetResources === 'function') {
    registerFeatSheetResources('Mist Walker', [
      {
        key: 'mist_walker_walk',
        name: 'Mist Walk',
        icon: 'wind',
        recharge: 'LR',
        max: 'proficiencyBonus',
      },
    ]);
  }
}
