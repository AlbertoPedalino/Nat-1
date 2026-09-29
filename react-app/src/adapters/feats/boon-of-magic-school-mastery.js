import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Boon of Magic School Mastery',
    actions: [
      { name: 'Rote Casting', icon: 'repeat', cat: 'action', uses: 'At will' },
      { name: 'Signature Arcanum', icon: 'sparkles', cat: 'special', uses: '1 / LR' },
    ],
  });
}
