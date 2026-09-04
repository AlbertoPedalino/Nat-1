import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Overload',
    adapt: withSpellAbilityChoice,
    actions: [{
      name: 'Power Surge', icon: 'zap', cat: 'special', uses: '1 / LR', resKey: 'arcane_overload_surge',
      desc: 'When an Evocation spell deals damage, add PB to one damage roll.',
    }],
    resources: [{ key: 'arcane_overload_surge', name: 'Power Surge', icon: 'zap', recharge: 'LR', max: 1 }],
  });
}
