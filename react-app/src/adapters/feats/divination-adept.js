import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Divination Adept',
    actions: [{
      name: 'Prescient Intervention', icon: 'eye', cat: 'reaction', uses: '1 / LR', resKey: 'divination_adept_intervention',
      desc: 'Give Advantage or Disadvantage to a visible creature making a D20 Test within 60 feet. A slotted Divination spell also restores the use.',
    }],
    resources: [{ key: 'divination_adept_intervention', name: 'Prescient Intervention', icon: 'eye', recharge: 'LR', max: 1 }],
  });
}
