import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Necromancy Adept',
    actions: [{
      name: 'Life Manipulation', icon: 'heart-pulse', cat: 'special', uses: 'Up to 2 Hit Dice',
      desc: 'After casting a slotted Necromancy spell, expend and roll up to two Hit Dice; regain HP equal to their total plus the slot level.',
    }],
  });
}
