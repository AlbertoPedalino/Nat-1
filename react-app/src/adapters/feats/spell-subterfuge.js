import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Spell Subterfuge',
    actions: [
      { name: 'Shrouding Spells', icon: 'footprints', cat: 'bonus', uses: 'Chosen ability mod / LR', desc: 'After casting an action-time spell with a slot, take both Dash and Hide as a Bonus Action.' },
    ],
  });
}
