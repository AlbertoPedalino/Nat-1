import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Illusory Dragon', { icon: 'dragon', saveAbility: 'wis', concentration: true });
}
