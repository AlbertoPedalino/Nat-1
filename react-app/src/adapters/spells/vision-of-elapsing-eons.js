import { installSpellDataAdapter } from '../spellAdapterHelpers.js';

export default function install(registry, context = {}) {
  installSpellDataAdapter(registry, context, 'Vision of Elapsing Eons', { icon: 'hourglass', saveAbility: 'int', dmgType: 'psychic' });
}
