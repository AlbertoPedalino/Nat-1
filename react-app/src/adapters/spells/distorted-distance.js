import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Distorted Distance', { icon: 'move', saveAbility: 'int', dmgType: 'psychic', concentration: true });
}
