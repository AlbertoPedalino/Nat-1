import { createAdapterBindings } from '../adapterBindings.js';

// World of Warcraft.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetResources, registerSpeciesSheetEffects } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Goblin_WoW', [
    {
      name: 'Fury of the Small',
      cat: 'special',
      resKey: 'goblin_fury_of_the_small',
      minLevel: 1,
    },
  ]);
  registerSpeciesSheetResources('Goblin_WoW', [
    { key: 'goblin_fury_of_the_small', name: 'Fury of the Small', recharge: 'LR', max: 'proficiencyBonus' },
  ]);
  registerSpeciesSheetEffects('Goblin_WoW', [
    { type: 'advantage', target: 'save', conditions: ['Charmed'], minLevel: 1, note: 'Fey Ancestry' },
  ]);
}
