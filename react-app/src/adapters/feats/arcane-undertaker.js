import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Undertaker',
    adapt: withSpellAbilityChoice,
    actions: [
      { name: 'Understanding of Death', icon: 'heart-pulse', cat: 'action', uses: '1 / LR', resKey: 'arcane_undertaker_inspiration', desc: 'When you use Help to stabilize a creature at 0 HP, gain Heroic Inspiration.' },
    ],
    resources: [{ key: 'arcane_undertaker_inspiration', name: 'Understanding of Death', icon: 'skull', recharge: 'LR', max: 1 }],
  });
}
