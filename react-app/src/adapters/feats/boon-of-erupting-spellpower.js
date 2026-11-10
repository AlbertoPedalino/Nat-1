import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Boon of Erupting Spellpower',
    actions: [{
      name: 'Spell Overload', cat: 'special', resKey: 'boon_erupting_spellpower',
    }],
    resources: [{ key: 'boon_erupting_spellpower', name: 'Spell Overload', recharge: 'SR+LR', max: 1 }],
  });
}
