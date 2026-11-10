import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Omens',
    actions: [{
      name: 'Helpful Premonition', cat: 'reaction', resKey: 'arcane_omens_premonition',
      rollers: [{ kind: 'utility', formula: '1d4', label: 'Saving throw bonus' }],
    }],
    resources: [{ key: 'arcane_omens_premonition', name: 'Helpful Premonition', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
