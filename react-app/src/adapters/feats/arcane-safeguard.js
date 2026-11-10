import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Safeguard',
    actions: [
      { name: 'Quick Resistance', cat: 'bonus', resKey: 'arcane_safeguard_resistance' },
    ],
    resources: [{ key: 'arcane_safeguard_resistance', name: 'Quick Resistance', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
