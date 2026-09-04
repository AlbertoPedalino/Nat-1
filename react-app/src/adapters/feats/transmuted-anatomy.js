import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Transmuted Anatomy',
    actions: [{
      name: 'Resilient Anatomy', icon: 'shield', cat: 'reaction', uses: 'PB / LR', resKey: 'transmuted_anatomy_resilience',
      rollers: [{ kind: 'utility', formula: '1d4', label: 'Constitution save bonus' }],
      desc: 'After failing a Constitution save, add 1d4. You also have Advantage against effects that would force you to shape-shift.',
    }],
    resources: [{ key: 'transmuted_anatomy_resilience', name: 'Resilient Anatomy', icon: 'shield', recharge: 'LR', max: 'proficiencyBonus' }],
    effects: [{ type: 'speed', value: 5, note: 'Lengthened Stride' }],
  });
}
