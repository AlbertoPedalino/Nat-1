import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Artist',
    actions: [{
      name: 'Inspiring Magic', cat: 'special', resKey: 'arcane_artist_inspiration',
    }],
    resources: [{ key: 'arcane_artist_inspiration', name: 'Inspiring Magic', recharge: 'LR', max: 1 }],
  });
}
