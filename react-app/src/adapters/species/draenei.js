import { createAdapterBindings } from '../adapterBindings.js';

// World of Warcraft. Each Eredar lineage's resistance and spells come from its
// data (speciesVersion.js); Heroic Presence is once per Short or Long Rest.
export default function install(registry, context = {}) {
  const { registerSpeciesSheetActions, registerSpeciesSheetResources } = createAdapterBindings(registry, context);

  registerSpeciesSheetActions('Draenei_WoW', [
    { name: 'Heroic Presence', cat: 'special', resKey: 'draenei_heroic_presence', minLevel: 1 },
  ]);
  registerSpeciesSheetResources('Draenei_WoW', [
    { key: 'draenei_heroic_presence', name: 'Heroic Presence', recharge: 'SR+LR', max: 1 },
  ]);
}
