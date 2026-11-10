import { createAdapterBindings } from '../adapterBindings.js';

// World of Warcraft. Poison Resistance and the two tool picks come from the
// species data.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetResources, registerSpeciesSheetEffects } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Mechagnome_WoW', [
    {
      name: 'Built for Success',
      cat: 'special',
      resKey: 'mechagnome_built_for_success',
      minLevel: 1,
      rollers: [{ kind: 'utility', formula: '1d4', label: 'D20 Test bonus' }],
    },
    { name: 'Emergency Fail-Safe', cat: 'reaction', resKey: 'mechagnome_fail_safe', minLevel: 1 },
  ]);
  registerSpeciesSheetResources('Mechagnome_WoW', [
    { key: 'mechagnome_built_for_success', name: 'Built for Success', recharge: 'LR', max: 'proficiencyBonus' },
    { key: 'mechagnome_fail_safe', name: 'Emergency Fail-Safe', recharge: 'SR+LR', max: 1 },
  ]);
  registerSpeciesSheetEffects('Mechagnome_WoW', [
    { type: 'advantage', target: 'save', conditions: ['Paralyzed', 'Poisoned'], minLevel: 1, note: 'Mechanical Nature' },
  ]);
}
