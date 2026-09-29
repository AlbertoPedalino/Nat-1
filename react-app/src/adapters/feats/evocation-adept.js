import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Evocation Adept',
    actions: [{
      name: 'Fueled Evocation', icon: 'flame', cat: 'special', uses: 'Up to 2 Hit Dice',
    }],
  });
}
