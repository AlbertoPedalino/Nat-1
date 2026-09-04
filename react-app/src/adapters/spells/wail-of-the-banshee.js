import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Wail of the Banshee', { icon: 'audio-lines', saveAbility: 'con', dmgType: 'psychic' });
}
