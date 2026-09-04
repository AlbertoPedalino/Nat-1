import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Infiltrator',
    adapt: withSpellAbilityChoice,
    actions: [{
      name: 'Cunning Diversion', icon: 'shield', cat: 'bonus', uses: 'PB / LR', resKey: 'arcane_infiltrator_diversion',
      desc: 'Take the Dodge action as a Bonus Action.',
    }],
    resources: [{ key: 'arcane_infiltrator_diversion', name: 'Cunning Diversion', icon: 'shield', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
