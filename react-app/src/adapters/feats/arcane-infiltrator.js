import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Infiltrator',
    adapt: withSpellAbilityChoice,
    actions: [{
      name: 'Cunning Diversion', cat: 'bonus', resKey: 'arcane_infiltrator_diversion',
    }],
    resources: [{ key: 'arcane_infiltrator_diversion', name: 'Cunning Diversion', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
