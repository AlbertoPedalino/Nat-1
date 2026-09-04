import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Safeguard',
    adapt: withSpellAbilityChoice,
    actions: [
      { name: 'Quick Resistance', icon: 'shield', cat: 'bonus', uses: 'PB / LR', resKey: 'arcane_safeguard_resistance', desc: 'Cast Resistance as a Bonus Action.' },
    ],
    resources: [{ key: 'arcane_safeguard_resistance', name: 'Quick Resistance', icon: 'shield', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
