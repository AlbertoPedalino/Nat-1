import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Waves of Exhaustion', { icon: 'waves', saveAbility: 'con', concentration: true });
}
