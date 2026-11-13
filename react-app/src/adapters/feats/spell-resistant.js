import { installFeatAdapter, withResistanceChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Spell Resistant',
    adapt: withResistanceChoice(['Necrotic', 'Psychic', 'Radiant', 'Thunder']),
    actions: [{
      name: 'Magic Resistant', cat: 'special', resKey: 'spell_resistant_magic',
      rollers: [{ kind: 'bonus', formula: '1d6', label: 'Save bonus' }],
    }],
    resources: [{ key: 'spell_resistant_magic', name: 'Magic Resistant', recharge: 'LR', max: 'proficiencyBonus' }],
    effects: [{ type: 'resistance-choice', choiceKeySuffix: 'resistance', note: 'Magical Resilience' }],
  });
}
