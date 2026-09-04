import { installFeatAdapter } from '../featAdapterHelpers.js';

function addResistanceChoice(feat) {
  return {
    ...feat,
    choiceUi: {
      ...(feat.choiceUi || {}),
      damageType: {
        keySuffix: 'resistance',
        label: 'Damage Resistance',
        options: ['Necrotic', 'Psychic', 'Radiant', 'Thunder'],
      },
    },
  };
}

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Spell Resistant',
    adapt: addResistanceChoice,
    actions: [{
      name: 'Magic Resistant', icon: 'shield', cat: 'special', uses: 'PB / LR', resKey: 'spell_resistant_magic',
      rollers: [{ kind: 'utility', formula: '1d6', label: 'Save bonus' }],
      desc: 'When you fail a save against a spell or magical effect, add 1d6 to the result.',
    }],
    resources: [{ key: 'spell_resistant_magic', name: 'Magic Resistant', icon: 'shield', recharge: 'LR', max: 'proficiencyBonus' }],
    effects: [{ type: 'resistance-choice', choiceKeySuffix: 'resistance', note: 'Magical Resilience' }],
  });
}
