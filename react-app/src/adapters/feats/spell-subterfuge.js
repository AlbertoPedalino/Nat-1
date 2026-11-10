import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Spell Subterfuge',
    actions: [
      { name: 'Shrouding Spells', cat: 'bonus',  },
    ],
  });
}
