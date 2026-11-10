import { createAdapterBindings } from '../adapterBindings.js';

// World of Warcraft.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetResources } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Worgen_WoW', [
    {
      name: 'Darkflight',
      cat: 'bonus',
      resKey: 'worgen_darkflight',
      minLevel: 1,
    },
  ]);
  registerSpeciesSheetResources('Worgen_WoW', [
    { key: 'worgen_darkflight', name: 'Darkflight', recharge: 'LR', max: 'proficiencyBonus' },
  ]);
}
