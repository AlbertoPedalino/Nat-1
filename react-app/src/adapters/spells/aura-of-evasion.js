import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Aura of Evasion', { icon: 'shield', saveAbility: 'dex', concentration: true });
}
