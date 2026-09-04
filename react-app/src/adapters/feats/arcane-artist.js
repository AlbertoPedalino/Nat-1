import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Artist',
    adapt: withSpellAbilityChoice,
    actions: [{
      name: 'Inspiring Magic', icon: 'sparkles', cat: 'special', uses: '1 / LR', resKey: 'arcane_artist_inspiration',
      desc: 'When you cast an Illusion spell, grant Heroic Inspiration to an ally within 30 feet who can see you.',
    }],
    resources: [{ key: 'arcane_artist_inspiration', name: 'Inspiring Magic', icon: 'sparkles', recharge: 'LR', max: 1 }],
  });
}
