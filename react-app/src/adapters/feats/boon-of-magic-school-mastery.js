import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Boon of Magic School Mastery',
    actions: [
      { name: 'Rote Casting', cat: 'action',  },
      { name: 'Signature Arcanum', cat: 'special',  },
    ],
  });
}
