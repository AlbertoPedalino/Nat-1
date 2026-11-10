import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);

  // Ravenloft Dark Gift. Mist Walk is a limited-use Reaction teleport; Domain
  // Traveler and Poisoned Roots are narrative/DM-facing and not tracked here.
  registerFeatSheetActions('Mist Walker', [
    {
      name: 'Mist Walk',
      cat: 'reaction',
      resKey: 'mist_walker_walk',
    },
  ]);

  registerFeatSheetResources('Mist Walker', [
    {
      key: 'mist_walker_walk',
      name: 'Mist Walk',
      recharge: 'LR',
      max: 'proficiencyBonus',
    },
  ]);
}
