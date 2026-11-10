import { createAdapterBindings } from '../adapterBindings.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

// World of Warcraft. Necrotic Resistance comes from the species data.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetResources, registerSpeciesSheetEffects } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Forsaken_WoW', [
    {
      name: 'Touch of the Grave',
      cat: 'special',
      resKey: 'forsaken_touch_of_the_grave',
      minLevel: 1,
      rollers: [{ kind: 'damage', formula: ({ character }) => `${getProficiencyBonus(character)}d4`, label: ({ formula }) => `${formula} necrotic` }],
    },
  ]);
  registerSpeciesSheetResources('Forsaken_WoW', [
    { key: 'forsaken_touch_of_the_grave', name: 'Touch of the Grave', recharge: 'LR', max: 1 },
  ]);
  registerSpeciesSheetEffects('Forsaken_WoW', [
    { type: 'advantage', target: 'save', conditions: ['Charmed', 'Frightened'], minLevel: 1, note: 'Will of the Forsaken' },
  ]);
}
