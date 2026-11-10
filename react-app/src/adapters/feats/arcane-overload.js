import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Overload',
    actions: [{
      name: 'Power Surge', cat: 'special', resKey: 'arcane_overload_surge',
    }],
    resources: [{ key: 'arcane_overload_surge', name: 'Power Surge', recharge: 'LR', max: 1 }],
  });
}
