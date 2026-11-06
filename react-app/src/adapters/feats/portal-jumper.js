import { installFeatAdapter, withResistanceChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Portal Jumper',
    adapt: withResistanceChoice(['Necrotic', 'Psychic', 'Radiant']),
    actions: [{
      name: 'Portal Step', icon: 'move', cat: 'special', uses: 'PB / LR', resKey: 'portal_jumper_step',
    }],
    resources: [{ key: 'portal_jumper_step', name: 'Portal Step', icon: 'move', recharge: 'LR', max: 'proficiencyBonus' }],
    effects: [{ type: 'resistance-choice', choiceKeySuffix: 'resistance', note: 'Otherworldly Resilience' }],
  });
}
