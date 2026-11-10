import { createAdapterBindings } from '../adapterBindings.js';

export default function install(registry, context = {}) {
  const { registerFeatSheetActions, registerFeatSheetResources } = createAdapterBindings(registry, context);

  // Origin feat. Hypervigilance is passive (reroll Initiative if 9 or lower);
  // Steel Yourself is a 1/LR Reaction.
  registerFeatSheetActions('Survivor', [
    {
      name: 'Steel Yourself',
      
      cat: 'reaction',
      
      resKey: 'survivor_steel',
    },
  ]);

  registerFeatSheetResources('Survivor', [
    {
      key: 'survivor_steel',
      name: 'Steel Yourself',
      
      recharge: 'LR',
      max: 1,
    },
  ]);
}
