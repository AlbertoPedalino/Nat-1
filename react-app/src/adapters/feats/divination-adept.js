import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Divination Adept',
    actions: [{
      name: 'Prescient Intervention', icon: 'eye', cat: 'reaction', uses: '1 / LR', resKey: 'divination_adept_intervention',
    }],
    resources: [{ key: 'divination_adept_intervention', name: 'Prescient Intervention', icon: 'eye', recharge: 'LR', max: 1 }],
  });
}
