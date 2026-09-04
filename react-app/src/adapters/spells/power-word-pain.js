import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Power Word Pain', { icon: 'audio-lines', saveAbility: 'con', dmgType: 'force' });
}
