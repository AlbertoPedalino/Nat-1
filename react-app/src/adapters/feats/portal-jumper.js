import { installFeatAdapter } from '../featAdapterHelpers.js';

function addResistanceChoice(feat) {
  return {
    ...feat,
    choiceUi: {
      ...(feat.choiceUi || {}),
      damageType: {
        keySuffix: 'resistance',
        label: 'Damage Resistance',
        options: ['Necrotic', 'Psychic', 'Radiant'],
      },
    },
  };
}

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Portal Jumper',
    adapt: addResistanceChoice,
    actions: [{
      name: 'Portal Step', icon: 'move', cat: 'special', uses: 'PB / LR', resKey: 'portal_jumper_step',
    }],
    resources: [{ key: 'portal_jumper_step', name: 'Portal Step', icon: 'move', recharge: 'LR', max: 'proficiencyBonus' }],
    effects: [{ type: 'resistance-choice', choiceKeySuffix: 'resistance', note: 'Otherworldly Resilience' }],
  });
}
