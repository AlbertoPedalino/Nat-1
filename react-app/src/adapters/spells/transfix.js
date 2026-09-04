import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Transfix', { icon: 'eye', saveAbility: 'cha', dmgType: 'psychic', concentration: true });
}
