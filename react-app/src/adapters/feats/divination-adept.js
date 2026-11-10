import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Divination Adept',
    actions: [{
      name: 'Prescient Intervention', cat: 'reaction', resKey: 'divination_adept_intervention',
    }],
    resources: [{ key: 'divination_adept_intervention', name: 'Prescient Intervention', recharge: 'LR', max: 1 }],
  });
}
