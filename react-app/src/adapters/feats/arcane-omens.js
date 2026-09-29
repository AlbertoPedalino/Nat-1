import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Omens',
    adapt: withSpellAbilityChoice,
    actions: [{
      name: 'Helpful Premonition', icon: 'eye', cat: 'reaction', uses: 'PB / LR', resKey: 'arcane_omens_premonition',
      rollers: [{ kind: 'utility', formula: '1d4', label: 'Saving throw bonus' }],
    }],
    resources: [{ key: 'arcane_omens_premonition', name: 'Helpful Premonition', icon: 'eye', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
