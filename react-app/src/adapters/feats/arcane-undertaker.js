import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Undertaker',
    actions: [
      { name: 'Understanding of Death', cat: 'action', resKey: 'arcane_undertaker_inspiration' },
    ],
    resources: [{ key: 'arcane_undertaker_inspiration', name: 'Understanding of Death', recharge: 'LR', max: 1 }],
  });
}
