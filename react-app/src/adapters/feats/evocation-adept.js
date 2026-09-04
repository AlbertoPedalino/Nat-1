import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Evocation Adept',
    actions: [{
      name: 'Fueled Evocation', icon: 'flame', cat: 'special', uses: 'Up to 2 Hit Dice',
      desc: 'Once per turn, expend up to two Hit Dice and add their roll to one damage roll of an Evocation spell.',
    }],
  });
}
