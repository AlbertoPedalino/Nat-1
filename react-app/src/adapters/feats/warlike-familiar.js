import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Warlike Familiar',
    actions: [{
      name: 'Intercept Attack', icon: 'shield', cat: 'reaction', uses: "Familiar's Reaction",
      desc: 'When a creature within 5 feet of your familiar is hit, the familiar adds your PB to its AC against that attack, potentially causing a miss.',
    }],
  });
}
