import { createAdapterBindings } from '../../adapterBindings.js';

// Oath of the Holy (World of Warcraft). Its oath spells come from the
// subclass data.
export default function install(registry, context = {}) {
  const { registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);

  registerSubclassSheetActions('Paladin_Holy', [
    { name: 'Beacon of Light', cat: 'action', resKey: 'paladin_channel_div', minLevel: 3, inlinePills: [{ label: 'Duration', value: '1 min' }] },
    { name: 'Holy Deliverance', cat: 'bonus', resKey: 'holy_deliverance', minLevel: 20, inlinePills: [{ label: 'Duration', value: '10 min' }] },
  ]);
  registerSubclassSheetResources('Paladin_Holy', [
    { key: 'holy_deliverance', name: 'Holy Deliverance', recharge: 'LR', max: 1, minLevel: 20 },
  ]);
}
