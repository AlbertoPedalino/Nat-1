import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Transmuted Anatomy',
    actions: [{
      name: 'Resilient Anatomy', icon: 'shield', cat: 'reaction', uses: 'PB / LR', resKey: 'transmuted_anatomy_resilience',
      rollers: [{ kind: 'utility', formula: '1d4', label: 'Constitution save bonus' }],
    }],
    resources: [{ key: 'transmuted_anatomy_resilience', name: 'Resilient Anatomy', icon: 'shield', recharge: 'LR', max: 'proficiencyBonus' }],
    effects: [{ type: 'speed', value: 5, note: 'Lengthened Stride' }],
  });
}
