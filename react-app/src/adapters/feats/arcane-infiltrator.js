import { installFeatAdapter } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Arcane Infiltrator',
    actions: [{
      name: 'Cunning Diversion', cat: 'bonus', resKey: 'arcane_infiltrator_diversion',
    }],
    resources: [{ key: 'arcane_infiltrator_diversion', name: 'Cunning Diversion', recharge: 'LR', max: 'proficiencyBonus' }],
  });
}
