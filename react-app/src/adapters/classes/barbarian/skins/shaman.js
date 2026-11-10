import { createAdapterBindings } from '../../../adapterBindings.js';

// Shaman (World of Warcraft), the Barbarian as a shaman: the Barbarian's
// entries come from its adapters, minus Primal Knowledge, which Totems
// replaces. The Primal Knowledge Totem is once per Long Rest (or a use of
// Rage, spent by hand).
export default function install(registry, context = {}) {
  const { registerClassSheetActions, registerClassSheetResources } = createAdapterBindings(registry, context);

  registerClassSheetActions('Shaman', [
    { name: 'Totems', cat: 'bonus', minLevel: 3, inlinePills: [{ label: 'Area', value: '30-ft Emanation' }, { label: 'Duration', value: '1 min' }] },
    { name: 'Primal Knowledge Totem', cat: 'bonus', resKey: 'shaman_primal_knowledge_totem', minLevel: 3 },
  ]);
  registerClassSheetResources('Shaman', [
    { key: 'shaman_primal_knowledge_totem', name: 'Primal Knowledge Totem', recharge: 'LR', max: 1, minLevel: 3 },
  ]);
}
