import { createAdapterBindings } from '../../../adapterBindings.js';

// Evoker (World of Warcraft), a skin of the Sorcerer: the Sorcerer's entries
// come from its adapters. Its Draconic Sorcery picks one of the subclass's
// spell lists in the data (Augmentation, Devastation, Preservation).
export default function install(registry, context = {}) {
  const { registerSubclassRuntimeConfig } = createAdapterBindings(registry, context);

  registerSubclassRuntimeConfig('Evoker_Draconic', { spellListChoice: { label: 'Evoker Spells' } });
}
