import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Boon of Erupting Spellpower',
    actions: [{
      name: 'Spell Overload', icon: 'burst', cat: 'special', uses: '1 / Initiative, SR or LR', resKey: 'boon_erupting_spellpower',
      desc: 'On a damaging slotted spell, treat damage-die rolls of 1 or 2 as 3; damaged creatures also fall Prone.',
    }],
    resources: [{ key: 'boon_erupting_spellpower', name: 'Spell Overload', icon: 'burst', recharge: 'SR+LR', max: 1 }],
  });
}
