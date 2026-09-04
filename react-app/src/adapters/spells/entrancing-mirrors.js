import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Entrancing Mirrors', { icon: 'gallery-vertical', saveAbility: 'int', dmgType: 'psychic', concentration: true });
}
