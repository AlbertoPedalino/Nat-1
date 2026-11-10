import { createAdapterBindings } from '../adapterBindings.js';

// World of Warcraft. Darkvision comes from the species data; Draconic Flight
// is the limited use to track.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetResources } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Dracthyr_WoW', [
    { name: 'Draconic Flight', cat: 'bonus', resKey: 'dracthyr_flight', minLevel: 5, inlinePills: [{ label: 'Duration', value: '10 min' }] },
  ]);
  registerSpeciesSheetResources('Dracthyr_WoW', [
    { key: 'dracthyr_flight', name: 'Draconic Flight', recharge: 'LR', minLevel: 5, max: 1 },
  ]);
}
