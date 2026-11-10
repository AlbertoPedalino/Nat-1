import { installFeatAdapter } from '../featAdapterHelpers.js';
import { getProficiencyBonus } from '../../shared/character/progression/proficiency.js';

// World of Warcraft. Frostbite: extra Cold damage, Proficiency Bonus d4s, to a
// Restrained creature.
export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, {
    name: 'Fingers of Frost',
    actions: [{
      name: 'Frostbite',
      cat: 'special',
      rollers: [{ kind: 'damage', formula: ({ character }) => `${getProficiencyBonus(character)}d4`, label: ({ formula }) => `${formula} cold` }],
    }],
  });
}
