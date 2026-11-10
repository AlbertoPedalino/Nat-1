import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Necromancy Adept',
    actions: [{
      name: 'Life Manipulation', cat: 'special', 
    }],
  });
}
