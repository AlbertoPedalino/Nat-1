import { createAdapterBindings } from '../../../adapterBindings.js';

// Shaman (World of Warcraft), the Barbarian as a shaman: the Barbarian's
// entries come from its adapters, minus Primal Knowledge, which Totems
// replaces. One Totems card; its use row tracks only the Primal Knowledge
// Totem, once per Long Rest (or a use of Rage, spent by hand).
export default function install(registry, context = {}) {
  const { registerClassSheetActions, registerClassSheetResources } = createAdapterBindings(registry, context);

  registerClassSheetActions('Shaman', [
    { name: 'Totems', cat: 'bonus', minLevel: 3, resKey: 'shaman_primal_knowledge_totem', resLabel: 'Primal Knowledge' },
  ]);
  registerClassSheetResources('Shaman', [
    { key: 'shaman_primal_knowledge_totem', name: 'Primal Knowledge Totem', recharge: 'LR', max: 1, minLevel: 3 },
  ]);
}
