import { installFeatAdapter, withResistanceChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Spell Resistant',
    adapt: withResistanceChoice(['Necrotic', 'Psychic', 'Radiant', 'Thunder']),
    actions: [{
      name: 'Magic Resistant', icon: 'shield', cat: 'special', uses: 'PB / LR', resKey: 'spell_resistant_magic',
      rollers: [{ kind: 'utility', formula: '1d6', label: 'Save bonus' }],
    }],
    resources: [{ key: 'spell_resistant_magic', name: 'Magic Resistant', icon: 'shield', recharge: 'LR', max: 'proficiencyBonus' }],
    effects: [{ type: 'resistance-choice', choiceKeySuffix: 'resistance', note: 'Magical Resilience' }],
  });
}
