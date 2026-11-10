import { createAdapterBindings } from '../../adapterBindings.js';

// Shadow Domain (World of Warcraft). Its always-prepared spells come from the
// subclass data.
export default function install(registry, context = {}) {
  const { registerSubclassSheetActions, registerSubclassSheetResources } = createAdapterBindings(registry, context);

  registerSubclassSheetActions('Cleric_Shadow', [
    {
      name: 'Devouring Plague',
      cat: 'special',
      resKey: 'shadow_devouring_plague',
      minLevel: 3,
      rollers: [{ kind: 'damage', formula: '1d10', label: ({ formula }) => `${formula} necrotic` }],
    },
    { name: 'Shadowform', cat: 'bonus', resKey: 'channel_div', minLevel: 3, inlinePills: [{ label: 'Duration', value: '1 min' }] },
    { name: 'Dispersion', cat: 'reaction', resKey: 'shadow_dispersion', minLevel: 6 },
  ]);
  registerSubclassSheetResources('Cleric_Shadow', [
    { key: 'shadow_devouring_plague', name: 'Devouring Plague', recharge: 'LR', max: 'abilityMod:wis', minMax: 1, minLevel: 3 },
    { key: 'shadow_dispersion', name: 'Dispersion', recharge: 'SR+LR', max: 1, minLevel: 6 },
  ]);
}
