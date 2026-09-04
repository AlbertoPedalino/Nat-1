import { installFeatAdapter, withSpellAbilityChoice } from '../featAdapterHelpers.js';

export default function install(registry, context = {}) {
  installFeatAdapter(registry, context, { name: 'Arcane Warrior', adapt: withSpellAbilityChoice });
}
